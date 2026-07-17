import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const draftEntry = new URL('../src/services/serviceCheckout.ts', import.meta.url);

const [
  checkout,
  draftService,
  paymentTypes,
  paymentFunction,
  leadFunction,
  paymentStatus,
  tryOn,
  leadConfig,
  analytics,
] = await Promise.all([
  read('src/pages/Checkout.tsx'),
  read('src/services/serviceCheckout.ts'),
  read('src/types/backend.ts'),
  read('supabase/functions/create-payment-intent/index.ts'),
  read('supabase/functions/submit-visit-lead/index.ts'),
  read('src/pages/PaymentStatus.tsx'),
  read('src/pages/TryOnPilot.tsx'),
  read('src/config/leads.ts'),
  read('src/lib/analyticsEvents.ts'),
]);

assert.match(draftService, /vilu_service_checkout_draft_v1/);
assert.match(draftService, /24 \* 60 \* 60 \* 1000/);
assert.doesNotMatch(draftService, /phone|email|contactValue|customerName/i);

const bundledDraftService = await build({
  entryPoints: [fileURLToPath(draftEntry)],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
});
const draftModuleUrl = `data:text/javascript;base64,${Buffer.from(bundledDraftService.outputFiles[0].text).toString('base64')}`;
const {
  createServiceCheckoutDraft,
  isServiceCheckoutDraft,
  normalizeServiceCheckoutFrames,
  SERVICE_CHECKOUT_MAX_AGE_MS,
} = await import(draftModuleUrl);

const sampleFrames = [
  { frameId: 'one', frameName: 'One' },
  { frameId: 'one', frameName: 'Duplicate' },
  { frameId: 'two', frameName: 'Two' },
  { frameId: 'three', frameName: 'Three' },
  { frameId: 'four', frameName: 'Four' },
];
assert.deepEqual(
  normalizeServiceCheckoutFrames(sampleFrames).map((frame) => frame.frameId),
  ['one', 'two', 'three'],
);

const validDraft = createServiceCheckoutDraft('/products', sampleFrames);
assert.equal(validDraft.selectedFrames.length, 3);
assert.equal(isServiceCheckoutDraft(validDraft), true);
assert.equal(
  isServiceCheckoutDraft({
    ...validDraft,
    createdAt: new Date(Date.now() - SERVICE_CHECKOUT_MAX_AGE_MS - 1).toISOString(),
  }),
  false,
);
assert.equal(
  isServiceCheckoutDraft({
    ...validDraft,
    contactValue: '@must_not_be_accepted',
  }),
  false,
  'drafts containing contact data must be rejected',
);
assert.equal(
  isServiceCheckoutDraft({
    ...validDraft,
    selectedFrames: [{ frameId: 'one', frameName: 'One', phone: '+7 900 000-00-00' }],
  }),
  false,
  'nested contact data in frames must be rejected',
);
assert.equal(
  isServiceCheckoutDraft({
    ...validDraft,
    storePreference: { mode: 'later', email: 'private@example.com' },
  }),
  false,
  'nested contact data in store preference must be rejected',
);

assert.match(paymentTypes, /leadId: string/);
assert.match(paymentFunction, /const OFFER_PRICE_RUB = 429/);
assert.match(paymentFunction, /\|\| !isUuid\(body\.leadId\)/);
assert.match(paymentFunction, /provider: 'none'/);

const leadCall = checkout.indexOf('await submitVisitLead(');
const paymentCall = checkout.indexOf('await createPaymentIntent(');
assert.ok(leadCall > -1 && paymentCall > leadCall, 'lead must be created before payment intent');
assert.match(checkout, /const leadIdRef = useRef\(''\)/);
assert.match(checkout, /if \(!leadIdRef\.current\)/);
assert.match(checkout, /leadId: leadIdRef\.current/);
assert.match(paymentStatus, /\[0, 2_000, 5_000, 10_000, 20_000\]/);
assert.match(paymentStatus, /clearPollTimer/);
assert.match(paymentStatus, /pollingExhausted/);
assert.match(paymentStatus, /renewServiceCheckoutPaymentAttempt/);
assert.match(checkout, /consentPersonalData: true/);
assert.doesNotMatch(checkout, /localStorage|sessionStorage|URLSearchParams/);

assert.match(tryOn, /buildLeadFormUrl/);
assert.match(leadConfig, /VITE_TALLY_FORM_URL/);
assert.match(leadFunction, /ALLOWED_WEB_ORIGINS/);
assert.doesNotMatch(leadFunction, /Access-Control-Allow-Origin': '\*'/);
assert.match(leadFunction, /MAX_BODY_BYTES/);
assert.match(leadFunction, /RATE_LIMIT_MAX_REQUESTS/);
assert.match(leadFunction, /SUPABASE_ANON_KEY/);
assert.match(leadFunction, /body\.selectedFrames\.every\(isValidFrame\)/);
assert.match(leadFunction, /isOptionalInteger\(frame\.framePriceRub, 0, 10_000_000\)/);
assert.match(leadFunction, /isOptionalInteger\(frame\.fitScore, 0, 100\)/);
assert.doesNotMatch(checkout, /contact:\s*contactValue\.trim\(\)/);
assert.match(analytics, /\/contact\/i/);

console.log('Service checkout contract checks passed.');

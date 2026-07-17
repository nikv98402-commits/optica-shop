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
  tryOn,
  analytics,
] = await Promise.all([
  read('src/pages/Checkout.tsx'),
  read('src/services/serviceCheckout.ts'),
  read('src/types/backend.ts'),
  read('supabase/functions/create-payment-intent/index.ts'),
  read('src/pages/TryOnPilot.tsx'),
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
assert.match(checkout, /consentPersonalData: true/);
assert.doesNotMatch(checkout, /localStorage|sessionStorage|URLSearchParams/);

assert.doesNotMatch(tryOn, /TALLY_FORM_URL|buildTallyUrl|contact_type:/);
assert.match(analytics, /\/contact\/i/);

console.log('Service checkout contract checks passed.');

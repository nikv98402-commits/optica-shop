declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
} | undefined;

type RpcRow = {
  offer_id: string;
  market_code: string;
  source_name: string;
  merchant_name: string;
  store_id: string | null;
  store_name: string | null;
  city: string | null;
  product_name: string;
  brand_name: string | null;
  comparable_key: string;
  amount_minor: number;
  currency: string;
  availability: 'in_stock' | 'preorder';
  freshness: 'fresh';
  last_verified_at: string;
  outbound_url: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_minimum_fresh_price: boolean;
};

type Dependencies = {
  anonKey: string;
  allowedOrigins: Set<string>;
  rpc: (params: Record<string, unknown>) => Promise<RpcRow[]>;
};

const MARKETS = new Set(['RU', 'AE', 'KZ', 'BY', 'AM', 'AZ', 'UZ', 'US', 'GB']);
const rateBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 60;

function cors(origin: string, allowed: Set<string>) {
  const accepted = allowed.has(origin) ? origin : 'https://vilu.store';
  return {
    'Access-Control-Allow-Origin': accepted,
    'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function envelope(data: unknown, error: { code: string; message: string } | null = null) {
  return {
    data,
    meta: { version: 'v1', generatedAt: new Date().toISOString() },
    error,
  };
}

function json(
  request: Request,
  allowed: Set<string>,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(request.headers.get('origin') || '', allowed),
      'Content-Type': 'application/json',
      'Cache-Control': status === 200 ? 'public, max-age=60, stale-while-revalidate=120' : 'no-store',
      ...extraHeaders,
    },
  });
}

async function privacyKey(request: Request) {
  const address = (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown')
    .split(',')[0].trim();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(address));
  return Array.from(new Uint8Array(digest)).slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function isRateLimited(request: Request, now = Date.now()) {
  const key = await privacyKey(request);
  const active = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
  if (active.length >= RATE_LIMIT) {
    rateBuckets.set(key, active);
    return true;
  }
  active.push(now);
  rateBuckets.set(key, active);
  return false;
}

function nextAction(row: RpcRow) {
  if (row.outbound_url) return { kind: 'website', value: row.outbound_url };
  if (row.phone) return { kind: 'phone', value: row.phone };
  if (row.latitude !== null && row.longitude !== null) {
    return { kind: 'route', value: `${row.latitude},${row.longitude}` };
  }
  return null;
}

function mapOffer(row: RpcRow) {
  return {
    offerId: row.offer_id,
    market: row.market_code,
    source: row.source_name,
    merchantName: row.merchant_name,
    storeId: row.store_id,
    storeName: row.store_name,
    city: row.city,
    productName: row.product_name,
    brandName: row.brand_name,
    comparableKey: row.comparable_key,
    amountMinor: row.amount_minor,
    currency: row.currency,
    availability: row.availability,
    freshness: row.freshness,
    lastVerifiedAt: row.last_verified_at,
    isMinimumConfirmedPrice: row.is_minimum_fresh_price,
    nextAction: nextAction(row),
  };
}

export async function handleOfferFinderRequest(request: Request, deps: Dependencies) {
  const origin = request.headers.get('origin') || '';
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors(origin, deps.allowedOrigins) });
  if (request.method !== 'GET') {
    return json(request, deps.allowedOrigins, envelope(null, {
      code: 'validation_failed',
      message: 'Only GET is supported',
    }), 405);
  }
  if (!deps.allowedOrigins.has(origin)) {
    return json(request, deps.allowedOrigins, envelope(null, {
      code: 'validation_failed',
      message: 'Origin is not allowed',
    }), 403);
  }
  if (!deps.anonKey || request.headers.get('apikey') !== deps.anonKey) {
    return json(request, deps.allowedOrigins, envelope(null, {
      code: 'validation_failed',
      message: 'Client authentication is required',
    }), 401);
  }
  if (await isRateLimited(request)) {
    return json(request, deps.allowedOrigins, envelope(null, {
      code: 'rate_limited',
      message: 'Too many requests',
    }), 429, { 'Retry-After': '60' });
  }

  const url = new URL(request.url);
  if (!url.pathname.endsWith('/offer-finder/v1/search')) {
    return json(request, deps.allowedOrigins, envelope(null, {
      code: 'not_found',
      message: 'Unknown Offer Finder route',
    }), 404);
  }
  const market = (url.searchParams.get('market') || '').toUpperCase();
  const product = (url.searchParams.get('product') || '').trim();
  const brand = (url.searchParams.get('brand') || '').trim();
  const storeId = (url.searchParams.get('store') || '').trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!MARKETS.has(market) || !product || product.length > 160 || brand.length > 120
    || (storeId && !isUuid.test(storeId))) {
    return json(request, deps.allowedOrigins, envelope(null, {
      code: 'validation_failed',
      message: 'Invalid market, product, brand or store',
    }), 400);
  }

  try {
    const rows = await deps.rpc({
      p_market: market,
      p_product_name: product,
      p_brand_name: brand || null,
      p_store_id: storeId || null,
      p_limit: 12,
    });
    const offers = rows.map(mapOffer);
    const body = envelope({
      offers,
      minimumConfirmedPrice: offers.find((offer) => offer.isMinimumConfirmedPrice) ?? null,
    });
    const serialized = JSON.stringify(body);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
    const etag = `"${Array.from(new Uint8Array(hash)).slice(0, 12)
      .map((byte) => byte.toString(16).padStart(2, '0')).join('')}"`;
    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304, headers: { ...cors(origin, deps.allowedOrigins), ETag: etag } });
    }
    return json(request, deps.allowedOrigins, body, 200, { ETag: etag });
  } catch {
    return json(request, deps.allowedOrigins, envelope(null, {
      code: 'unavailable',
      message: 'Offer Finder is temporarily unavailable',
    }), 503);
  }
}

async function productionDependencies(): Promise<Dependencies> {
  const supabaseUrl = Deno?.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno?.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const anonKey = Deno?.env.get('SUPABASE_ANON_KEY') || '';
  const allowedOrigins = new Set(
    (Deno?.env.get('OFFER_FINDER_ALLOWED_ORIGINS')
      || 'https://vilu.store,https://www.vilu.store,http://localhost:5173,http://127.0.0.1:5173')
      .split(',').map((value) => value.trim()).filter(Boolean),
  );
  return {
    anonKey,
    allowedOrigins,
    rpc: async (params) => {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/offer_product_card_v1`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new Error('offer_rpc_unavailable');
      return response.json() as Promise<RpcRow[]>;
    },
  };
}

if (typeof Deno !== 'undefined') {
  Deno.serve(async (request) => handleOfferFinderRequest(request, await productionDependencies()));
}

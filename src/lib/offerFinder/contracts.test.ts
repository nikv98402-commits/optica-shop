import { createElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { ProductDetail } from '../../pages/ProductDetail';
import {
  handleOfferFinderRequest,
  resolvePublicApiKeys,
} from '../../../supabase/functions/offer-finder/index';
import {
  classifyOfferFreshness,
  formatOfferPrice,
  normalizeOfferSearchQuery,
  searchProductOffers,
  type OfferFinderEnvelope,
  type PublicOffer,
} from './contracts';

vi.mock('../../components/VirtualTryOn', () => ({
  VirtualTryOn: () => createElement('div', null, 'Virtual try-on'),
}));
vi.mock('../../components/home/AtomicHeading', () => ({
  AtomicHeading: ({ lines }: { lines: string[] }) => createElement('h1', null, lines.join(' ')),
}));
vi.mock('../../components/home/OpticalOrbits', () => ({
  OpticalOrbits: () => null,
}));

const offerRow = {
  offer_id: 'b734f1c6-5321-4d9c-b4cb-6fd291caf454',
  market_code: 'RU',
  source_name: 'Публичный каталог партнёра',
  merchant_name: 'Оптика рядом',
  store_id: null,
  store_name: null,
  city: 'Москва',
  product_name: 'Aurora Crystal',
  brand_name: 'ViLu Atelier',
  comparable_key: 'sku:aurora-crystal',
  amount_minor: 1199000,
  currency: 'RUB',
  availability: 'in_stock' as const,
  freshness: 'fresh' as const,
  last_verified_at: '2026-07-26T08:00:00.000Z',
  outbound_url: 'https://merchant.example/aurora',
  phone: null,
  latitude: null,
  longitude: null,
  is_minimum_fresh_price: true,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Offer Finder v1 contracts', () => {
  const now = '2026-07-24T12:00:00.000Z';

  it('uses the approved inclusive freshness boundaries', () => {
    expect(classifyOfferFreshness('2026-07-21T12:00:00.000Z', now)).toBe('fresh');
    expect(classifyOfferFreshness('2026-07-21T11:59:59.999Z', now)).toBe('stale');
    expect(classifyOfferFreshness('2026-07-17T12:00:00.000Z', now)).toBe('stale');
    expect(classifyOfferFreshness('2026-07-17T11:59:59.999Z', now)).toBe('expired');
  });

  it('rejects future and malformed timestamps', () => {
    expect(() => classifyOfferFreshness('2026-07-25T12:00:00.000Z', now)).toThrow(TypeError);
    expect(() => classifyOfferFreshness('not-a-date', now)).toThrow(TypeError);
  });

  it('normalizes safe bounded search inputs', () => {
    expect(normalizeOfferSearchQuery({ market: 'AE', city: ' Dubai ' })).toEqual({
      market: 'AE',
      city: 'Dubai',
      includeStale: false,
      limit: 20,
    });
    expect(normalizeOfferSearchQuery({ market: 'US', limit: 50, includeStale: true }).limit).toBe(50);
  });

  it('rejects unsupported markets, product types and unbounded limits', () => {
    expect(() => normalizeOfferSearchQuery({ market: 'FR' as 'RU' })).toThrow('Unsupported market');
    expect(() => normalizeOfferSearchQuery({
      market: 'RU',
      productType: 'medicine' as 'service',
    })).toThrow('Unsupported product type');
    expect(() => normalizeOfferSearchQuery({ market: 'RU', limit: 51 })).toThrow(RangeError);
  });

  it('keeps the browser response free of raw ingestion fields', () => {
    const offer: PublicOffer = {
      offerId: crypto.randomUUID(),
      market: 'RU',
      merchantId: crypto.randomUUID(),
      merchantName: 'Public merchant',
      storeId: null,
      storeName: null,
      city: null,
      productType: 'eyeglasses',
      productName: 'Model 01',
      brandName: null,
      comparableKey: 'sku:model-01',
      comparisonBasis: 'exact_sku',
      amountMinor: 1299000,
      currency: 'RUB',
      freshness: 'fresh',
      lastVerifiedAt: now,
      expiresAt: '2026-07-31T12:00:00.000Z',
      outboundUrl: 'https://merchant.example/model-01',
      isMinimumFreshPrice: true,
    };
    const envelope: OfferFinderEnvelope<PublicOffer> = {
      data: offer,
      meta: { version: 'v1', generatedAt: now },
      error: null,
    };

    expect(JSON.stringify(envelope)).not.toMatch(/payload|observationHash|diagnostic|sourceUrlHash/);
  });

  it('formats integer minor units in their original currency', () => {
    expect(formatOfferPrice(1199000, 'RUB')).toMatch(/11[\s\u00a0]?990/);
  });

  it('validates the browser contract and sends bounded product filters', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('/offer-finder/v1/search');
      return new Response(JSON.stringify({
      data: {
        offers: [{
          offerId: offerRow.offer_id,
          market: 'RU',
          source: offerRow.source_name,
          merchantName: offerRow.merchant_name,
          storeId: null,
          storeName: null,
          city: offerRow.city,
          productName: offerRow.product_name,
          brandName: offerRow.brand_name,
          comparableKey: offerRow.comparable_key,
          amountMinor: offerRow.amount_minor,
          currency: 'RUB',
          availability: 'in_stock',
          freshness: 'fresh',
          lastVerifiedAt: offerRow.last_verified_at,
          isMinimumConfirmedPrice: true,
          nextAction: { kind: 'website', value: offerRow.outbound_url },
        }],
        minimumConfirmedPrice: null,
      },
      meta: { version: 'v1', generatedAt: '2026-07-26T09:00:00.000Z' },
        error: null,
      }), { status: 200 });
    });

    const result = await searchProductOffers(
      { market: 'RU', product: ' Aurora Crystal ', brand: ' ViLu Atelier ' },
      { fetcher: fetcher as typeof fetch, baseUrl: 'https://project.supabase.co/', anonKey: 'anon' },
    );

    expect(result.offers).toHaveLength(1);
    const requestUrl = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(requestUrl.pathname).toBe('/functions/v1/offer-finder/v1/search');
    expect(requestUrl.searchParams.get('product')).toBe('Aurora Crystal');
    expect(requestUrl.searchParams.get('brand')).toBe('ViLu Atelier');
  });
});

describe('Offer Finder Edge BFF integration', () => {
  it('accepts both legacy anon and current Supabase publishable keys', () => {
    const keys = resolvePublicApiKeys('legacy-anon', JSON.stringify({
      default: 'sb_publishable_browser',
      nested: { key: 'sb_publishable_rotated' },
      ignored: 'sb_secret_server',
    }));

    expect([...keys]).toEqual([
      'legacy-anon',
      'sb_publishable_browser',
      'sb_publishable_rotated',
    ]);
  });

  it('maps the protected RPC projection without leaking operational fields', async () => {
    const rpc = vi.fn(async () => [offerRow]);
    const request = new Request(
      'https://project.supabase.co/functions/v1/offer-finder/v1/search?market=RU&product=Aurora%20Crystal&brand=ViLu%20Atelier',
      { headers: { origin: 'https://vilu.store', apikey: 'anon' } },
    );
    const response = await handleOfferFinderRequest(request, {
      publicApiKeys: new Set(['anon', 'sb_publishable_browser']),
      allowedOrigins: new Set(['https://vilu.store']),
      rpc,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toMatch(/^"/);
    expect(rpc).toHaveBeenCalledWith(expect.objectContaining({
      p_market: 'RU',
      p_product_name: 'Aurora Crystal',
      p_brand_name: 'ViLu Atelier',
      p_limit: 12,
    }));
    expect(body.data.minimumConfirmedPrice).toEqual(expect.objectContaining({
      source: 'Публичный каталог партнёра',
      availability: 'in_stock',
      nextAction: { kind: 'website', value: 'https://merchant.example/aurora' },
    }));
    expect(JSON.stringify(body)).not.toMatch(/protected_url|phone|latitude|longitude|observation|payload/);
  });

  it('prefers a store route, then a phone call, and uses the website as fallback', async () => {
    const rpc = vi.fn(async () => [
      { ...offerRow, offer_id: crypto.randomUUID(), latitude: 55.7558, longitude: 37.6173, phone: '+74950000000' },
      { ...offerRow, offer_id: crypto.randomUUID(), latitude: null, longitude: null, phone: '+74951111111' },
      { ...offerRow, offer_id: crypto.randomUUID(), latitude: null, longitude: null, phone: null },
    ]);
    const response = await handleOfferFinderRequest(new Request(
      'https://project.supabase.co/functions/v1/offer-finder/v1/search?market=RU&product=Aurora',
      { headers: { origin: 'https://vilu.store', apikey: 'anon' } },
    ), {
      publicApiKeys: new Set(['anon']),
      allowedOrigins: new Set(['https://vilu.store']),
      rpc,
    });
    const body = await response.json();

    expect(body.data.offers.map((offer: { nextAction: unknown }) => offer.nextAction)).toEqual([
      { kind: 'route', value: '55.7558,37.6173' },
      { kind: 'phone', value: '+74951111111' },
      { kind: 'website', value: 'https://merchant.example/aurora' },
    ]);
  });

  it('rejects unknown origins and malformed store filters before calling RPC', async () => {
    const rpc = vi.fn(async () => []);
    const response = await handleOfferFinderRequest(new Request(
      'https://project.supabase.co/functions/v1/offer-finder/v1/search?market=RU&product=Aurora&store=not-a-uuid',
      { headers: { origin: 'https://evil.example', apikey: 'anon' } },
    ), {
      publicApiKeys: new Set(['anon']),
      allowedOrigins: new Set(['https://vilu.store']),
      rpc,
    });

    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('Product detail Offer Finder states', () => {
  function renderProduct() {
    return render(createElement(
      LanguageProvider,
      null,
      createElement(ProductDetail, {
        productId: 'aurora-crystal',
        onNavigate: vi.fn(),
        onStartCheckout: vi.fn(),
      }),
    ));
  }

  it('shows loading and then an explicit empty state', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: { offers: [], minimumConfirmedPrice: null },
      meta: { version: 'v1', generatedAt: '2026-07-26T09:00:00.000Z' },
      error: null,
    }), { status: 200 })));

    renderProduct();
    expect(screen.getByRole('status')).toHaveTextContent('Проверяем актуальные цены');
    expect(await screen.findByText('Свежих предложений пока нет')).toBeInTheDocument();
  });

  it('shows a safe error without hiding the catalogue price', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));

    renderProduct();
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось проверить предложения');
    expect(screen.getByText(/12\s?990 ₽/)).toBeInTheDocument();
  });

  it('renders source, verification, availability and next action', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        offers: [{
          offerId: offerRow.offer_id,
          market: 'RU',
          source: offerRow.source_name,
          merchantName: offerRow.merchant_name,
          storeId: null,
          storeName: null,
          city: offerRow.city,
          productName: offerRow.product_name,
          brandName: offerRow.brand_name,
          comparableKey: offerRow.comparable_key,
          amountMinor: offerRow.amount_minor,
          currency: 'RUB',
          availability: 'in_stock',
          freshness: 'fresh',
          lastVerifiedAt: offerRow.last_verified_at,
          isMinimumConfirmedPrice: true,
          nextAction: { kind: 'website', value: offerRow.outbound_url },
        }],
        minimumConfirmedPrice: {
          offerId: offerRow.offer_id,
          market: 'RU',
          source: offerRow.source_name,
          merchantName: offerRow.merchant_name,
          storeId: null,
          storeName: null,
          city: offerRow.city,
          productName: offerRow.product_name,
          brandName: offerRow.brand_name,
          comparableKey: offerRow.comparable_key,
          amountMinor: offerRow.amount_minor,
          currency: 'RUB',
          availability: 'in_stock',
          freshness: 'fresh',
          lastVerifiedAt: offerRow.last_verified_at,
          isMinimumConfirmedPrice: true,
          nextAction: { kind: 'website', value: offerRow.outbound_url },
        },
      },
      meta: { version: 'v1', generatedAt: '2026-07-26T09:00:00.000Z' },
      error: null,
    }), { status: 200 })));

    renderProduct();
    expect(await screen.findByText('Оптика рядом')).toBeInTheDocument();
    expect(screen.getByText(/Источник: Публичный каталог партнёра/)).toBeInTheDocument();
    expect(screen.getByText(/В наличии/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'На сайт' })).toHaveAttribute(
      'href',
      'https://merchant.example/aurora',
    );
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('renders call and route actions with safe destination URLs', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    const baseOffer = {
      offerId: offerRow.offer_id,
      market: 'RU',
      source: offerRow.source_name,
      merchantName: offerRow.merchant_name,
      storeId: null,
      storeName: null,
      city: offerRow.city,
      productName: offerRow.product_name,
      brandName: offerRow.brand_name,
      comparableKey: offerRow.comparable_key,
      amountMinor: offerRow.amount_minor,
      currency: 'RUB',
      availability: 'in_stock',
      freshness: 'fresh',
      lastVerifiedAt: offerRow.last_verified_at,
      isMinimumConfirmedPrice: false,
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        offers: [
          { ...baseOffer, offerId: crypto.randomUUID(), nextAction: { kind: 'phone', value: '+74951111111' } },
          { ...baseOffer, offerId: crypto.randomUUID(), nextAction: { kind: 'route', value: '55.7558,37.6173' } },
        ],
        minimumConfirmedPrice: null,
      },
      meta: { version: 'v1', generatedAt: '2026-07-26T09:00:00.000Z' },
      error: null,
    }), { status: 200 })));

    renderProduct();

    expect(await screen.findByRole('link', { name: 'Позвонить' })).toHaveAttribute(
      'href',
      'tel:+74951111111',
    );
    expect(screen.getByRole('link', { name: 'Маршрут' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=55.7558%2C37.6173',
    );
  });
});

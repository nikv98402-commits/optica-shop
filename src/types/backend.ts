export type ContactChannel = 'phone' | 'whatsapp' | 'telegram' | 'email';

export type BackendSourcePage = '/tryon' | '/products' | '/vision-tracker';

export type ServiceCheckoutSource = '/products' | '/tryon';

export interface ServiceCheckoutFrame {
  frameId: string;
  frameName: string;
  frameBrand?: string;
  frameCategory?: string;
  frameSize?: string;
  framePriceRub?: number;
  fitScore?: number;
  useCase?: string;
  imageUrl?: string;
}

export type ServiceCheckoutStorePreference =
  | { mode: 'store'; city: string; storeId: string; storeName: string }
  | { mode: 'city'; city: string }
  | { mode: 'later' };

export interface ServiceCheckoutDraft {
  version: 1;
  sourcePage: ServiceCheckoutSource;
  selectedFrames: ServiceCheckoutFrame[];
  storePreference: ServiceCheckoutStorePreference;
  createdAt: string;
}

export interface VisitLeadFramePayload {
  frameId: string;
  frameName: string;
  frameBrand?: string;
  frameCategory?: string;
  frameSize?: string;
  framePriceRub?: number;
  fitScore?: number;
  useCase?: string;
}

export interface SubmitVisitLeadRequest {
  locale: 'ru' | 'en';
  customerName?: string;
  contactValue: string;
  contactChannel: ContactChannel;
  city?: string;
  preferredStoreId?: string;
  preferredStoreName?: string;
  consentPersonalData: true;
  consentVersion: string;
  privacyVersion: string;
  sourcePage: BackendSourcePage;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  selectedFrames: VisitLeadFramePayload[];
  comment?: string;
}

export interface SubmitVisitLeadResponse {
  leadId: string;
  status: 'new';
  nextStep: 'payment_optional' | 'contact_pending';
}

export type PaymentOfferCode = 'visit_preparation_v1';
export type PaymentIntentStatus = 'draft' | 'provider_created' | 'paid' | 'cancelled' | 'failed';

export interface CreatePaymentIntentRequest {
  offerCode: PaymentOfferCode;
  leadId: string;
  sourcePage: '/tryon' | '/products';
  idempotencyKey: string;
}

export interface CreatePaymentIntentResponse {
  paymentIntentId: string;
  publicToken: string;
  offerCode: PaymentOfferCode;
  amountRub: 429;
  currency: 'RUB';
  status: PaymentIntentStatus;
  providerMode: 'test_not_connected' | 'checkout';
  returnUrl: string;
  checkoutUrl?: string;
}

export interface PublicPaymentStatusResponse {
  publicToken: string;
  offerCode: PaymentOfferCode;
  amountRub: 429;
  currency: 'RUB';
  status: PaymentIntentStatus;
  providerMode: 'test_not_connected' | 'checkout';
  paidAt?: string;
  failureCode?: string;
}

export type BackendResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'backend_disabled' | 'privacy_payload_rejected' | 'validation_failed' | 'request_failed'; message: string };

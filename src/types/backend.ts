export type ContactChannel = 'phone' | 'whatsapp' | 'telegram' | 'email';

export type BackendSourcePage = '/tryon' | '/products' | '/vision-tracker';

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

export type PaymentProvider = 'none' | 'yookassa' | 'stripe';

export interface CreatePaymentIntentRequest {
  leadId?: string;
  serviceType: 'visit_preparation';
  amountRub: number;
  currency: 'RUB';
  provider: PaymentProvider;
  sourcePage: '/tryon' | '/products';
}

export interface CreatePaymentIntentResponse {
  paymentIntentId: string;
  status: 'draft' | 'provider_created';
  providerMode: 'not_connected' | 'checkout';
  checkoutUrl?: string;
}

export type BackendResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'backend_disabled' | 'privacy_payload_rejected' | 'validation_failed' | 'request_failed'; message: string };

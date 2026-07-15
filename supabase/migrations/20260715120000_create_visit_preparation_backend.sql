-- Production backend foundation for ViLu visit preparation.
-- Privacy rule: do not persist face photos, prescriptions, symptoms, exact geolocation, or health-context notes.

DO $$
BEGIN
  CREATE TYPE public.visit_lead_status AS ENUM ('new', 'contacted', 'converted', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.payment_intent_status AS ENUM ('draft', 'provider_created', 'paid', 'cancelled', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.payment_provider AS ENUM ('none', 'yookassa', 'stripe');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.visit_preparation_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status public.visit_lead_status NOT NULL DEFAULT 'new',
  locale text NOT NULL DEFAULT 'ru' CHECK (locale IN ('ru', 'en')),
  contact_channel text NOT NULL CHECK (contact_channel IN ('phone', 'whatsapp', 'telegram', 'email')),
  contact_value text NOT NULL,
  city text,
  preferred_store_id text,
  preferred_store_name text,
  source_page text NOT NULL CHECK (source_page IN ('/tryon', '/products', '/vision-tracker')),
  consent_personal_data boolean NOT NULL CHECK (consent_personal_data = true),
  consent_version text NOT NULL,
  privacy_version text NOT NULL,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.visit_preparation_leads IS
  'User-requested visit preparation leads. Stores contact and selected-frame intent only; no face photos, prescriptions, symptoms, or exact geolocation.';
COMMENT ON COLUMN public.visit_preparation_leads.contact_value IS 'Personal contact value. Access only through service-role backend functions.';
COMMENT ON COLUMN public.visit_preparation_leads.comment IS 'Free-form visit comment. Must not be used for medical or prescription data.';

CREATE TABLE IF NOT EXISTS public.visit_preparation_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.visit_preparation_leads(id) ON DELETE CASCADE,
  frame_id text NOT NULL,
  frame_name text NOT NULL,
  frame_brand text,
  frame_category text,
  frame_size text,
  frame_price_rub integer CHECK (frame_price_rub IS NULL OR frame_price_rub >= 0),
  fit_score integer CHECK (fit_score IS NULL OR fit_score BETWEEN 0 AND 100),
  use_case text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.visit_preparation_frames IS
  'Shortlist of frames chosen for a visit. This table stores product intent, not biometric data.';

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.visit_preparation_leads(id) ON DELETE SET NULL,
  service_type text NOT NULL CHECK (service_type = 'visit_preparation'),
  amount_rub integer NOT NULL CHECK (amount_rub >= 0),
  currency text NOT NULL DEFAULT 'RUB' CHECK (currency = 'RUB'),
  provider public.payment_provider NOT NULL DEFAULT 'none',
  provider_payment_id text,
  status public.payment_intent_status NOT NULL DEFAULT 'draft',
  source_page text NOT NULL CHECK (source_page IN ('/tryon', '/products')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_intents IS
  'Payment-intent audit trail for paid service validation. It can be created before a real provider is connected.';
COMMENT ON COLUMN public.payment_intents.provider_payment_id IS 'External payment id after YooKassa/Stripe is connected. Empty in MVP validation mode.';

CREATE TABLE IF NOT EXISTS public.partner_optics (
  id text PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  phone text,
  whatsapp text,
  telegram text,
  hours text,
  is_partner boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  public_source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.partner_optics IS
  'Public optics directory and future partner catalog. Safe for public read when is_active=true.';

DROP TRIGGER IF EXISTS set_visit_preparation_leads_updated_at ON public.visit_preparation_leads;
CREATE TRIGGER set_visit_preparation_leads_updated_at
  BEFORE UPDATE ON public.visit_preparation_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_payment_intents_updated_at ON public.payment_intents;
CREATE TRIGGER set_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_partner_optics_updated_at ON public.partner_optics;
CREATE TRIGGER set_partner_optics_updated_at
  BEFORE UPDATE ON public.partner_optics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS visit_preparation_leads_created_at_idx ON public.visit_preparation_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS visit_preparation_leads_city_idx ON public.visit_preparation_leads(city);
CREATE INDEX IF NOT EXISTS visit_preparation_frames_lead_id_idx ON public.visit_preparation_frames(lead_id);
CREATE INDEX IF NOT EXISTS payment_intents_lead_id_idx ON public.payment_intents(lead_id);
CREATE INDEX IF NOT EXISTS payment_intents_created_at_idx ON public.payment_intents(created_at DESC);
CREATE INDEX IF NOT EXISTS partner_optics_city_idx ON public.partner_optics(city);
CREATE INDEX IF NOT EXISTS partner_optics_active_idx ON public.partner_optics(is_active);

ALTER TABLE public.visit_preparation_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_preparation_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_optics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active partner optics" ON public.partner_optics;
CREATE POLICY "Anyone can read active partner optics"
  ON public.partner_optics
  FOR SELECT
  USING (is_active = true);

-- No public insert/update/select policies for lead and payment tables.
-- Edge Functions write through the Supabase service role and enforce validation.

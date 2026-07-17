-- Make visit lead creation atomic and bind payment creation to an opaque lead capability.
ALTER TABLE public.visit_preparation_leads
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS payment_capability_token uuid DEFAULT gen_random_uuid();

UPDATE public.visit_preparation_leads
SET payment_capability_token = gen_random_uuid()
WHERE payment_capability_token IS NULL;

ALTER TABLE public.visit_preparation_leads
  ALTER COLUMN payment_capability_token SET DEFAULT gen_random_uuid(),
  ALTER COLUMN payment_capability_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS visit_preparation_leads_payment_capability_uidx
  ON public.visit_preparation_leads(payment_capability_token);

DROP INDEX IF EXISTS public.payment_intents_idempotency_key_uidx;
CREATE UNIQUE INDEX payment_intents_idempotency_key_uidx
  ON public.payment_intents(idempotency_key);

COMMENT ON COLUMN public.visit_preparation_leads.customer_name IS
  'Optional customer name supplied with explicit consent. Never exposed in public payment responses.';
COMMENT ON COLUMN public.visit_preparation_leads.payment_capability_token IS
  'Opaque capability required to create a payment intent for this lead.';

CREATE OR REPLACE FUNCTION public.submit_visit_preparation_lead(
  p_locale text,
  p_customer_name text,
  p_contact_channel text,
  p_contact_value text,
  p_city text,
  p_preferred_store_id text,
  p_preferred_store_name text,
  p_source_page text,
  p_consent_version text,
  p_privacy_version text,
  p_utm jsonb,
  p_comment text,
  p_selected_frames jsonb
)
RETURNS TABLE(lead_id uuid, payment_capability_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_capability uuid;
BEGIN
  IF p_locale NOT IN ('ru', 'en')
    OR p_contact_channel NOT IN ('phone', 'whatsapp', 'telegram', 'email')
    OR length(trim(p_contact_value)) < 3
    OR p_source_page NOT IN ('/tryon', '/products', '/vision-tracker')
    OR p_consent_version IS NULL
    OR p_privacy_version IS NULL
    OR jsonb_typeof(p_selected_frames) <> 'array'
    OR jsonb_array_length(p_selected_frames) < 1
  THEN
    RAISE EXCEPTION 'validation_failed';
  END IF;

  INSERT INTO public.visit_preparation_leads AS created_lead (
    locale,
    customer_name,
    contact_channel,
    contact_value,
    city,
    preferred_store_id,
    preferred_store_name,
    source_page,
    consent_personal_data,
    consent_version,
    privacy_version,
    utm,
    comment
  )
  VALUES (
    p_locale,
    NULLIF(trim(p_customer_name), ''),
    p_contact_channel,
    trim(p_contact_value),
    NULLIF(trim(p_city), ''),
    NULLIF(trim(p_preferred_store_id), ''),
    NULLIF(trim(p_preferred_store_name), ''),
    p_source_page,
    true,
    p_consent_version,
    p_privacy_version,
    COALESCE(p_utm, '{}'::jsonb),
    NULLIF(trim(p_comment), '')
  )
  RETURNING created_lead.id, created_lead.payment_capability_token
  INTO v_lead_id, v_capability;

  INSERT INTO public.visit_preparation_frames (
    lead_id,
    frame_id,
    frame_name,
    frame_brand,
    frame_category,
    frame_size,
    frame_price_rub,
    fit_score,
    use_case
  )
  SELECT
    v_lead_id,
    frame->>'frameId',
    frame->>'frameName',
    NULLIF(frame->>'frameBrand', ''),
    NULLIF(frame->>'frameCategory', ''),
    NULLIF(frame->>'frameSize', ''),
    NULLIF(frame->>'framePriceRub', '')::integer,
    NULLIF(frame->>'fitScore', '')::integer,
    NULLIF(frame->>'useCase', '')
  FROM jsonb_array_elements(p_selected_frames) WITH ORDINALITY AS selected(frame, position)
  WHERE position <= 3
    AND length(COALESCE(frame->>'frameId', '')) > 0
    AND length(COALESCE(frame->>'frameName', '')) > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'frames_validation_failed';
  END IF;

  RETURN QUERY SELECT v_lead_id, v_capability;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_visit_preparation_lead(
  text, text, text, text, text, text, text, text, text, text, jsonb, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_visit_preparation_lead(
  text, text, text, text, text, text, text, text, text, text, jsonb, text, jsonb
) TO service_role;

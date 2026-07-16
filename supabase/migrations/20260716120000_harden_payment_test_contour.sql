-- Safe payment test contour. This migration does not enable real charges.
ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS offer_code text,
  ADD COLUMN IF NOT EXISTS public_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_code text;

UPDATE public.payment_intents
SET offer_code = 'visit_preparation_v1'
WHERE offer_code IS NULL;

UPDATE public.payment_intents
SET public_token = gen_random_uuid()
WHERE public_token IS NULL;

ALTER TABLE public.payment_intents
  ALTER COLUMN offer_code SET NOT NULL,
  ALTER COLUMN public_token SET NOT NULL;

ALTER TABLE public.payment_intents
  DROP CONSTRAINT IF EXISTS payment_intents_offer_code_check;
ALTER TABLE public.payment_intents
  ADD CONSTRAINT payment_intents_offer_code_check CHECK (offer_code = 'visit_preparation_v1');

CREATE UNIQUE INDEX IF NOT EXISTS payment_intents_public_token_uidx
  ON public.payment_intents(public_token);
CREATE UNIQUE INDEX IF NOT EXISTS payment_intents_idempotency_key_uidx
  ON public.payment_intents(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_intents_provider_payment_id_uidx
  ON public.payment_intents(provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

COMMENT ON COLUMN public.payment_intents.offer_code IS 'Server-owned commercial offer identifier.';
COMMENT ON COLUMN public.payment_intents.public_token IS 'Opaque token for minimal public-safe status lookup.';
COMMENT ON COLUMN public.payment_intents.idempotency_key IS 'Client-generated UUID used to prevent duplicate intent creation.';

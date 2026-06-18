export const TALLY_FORM_URL = import.meta.env.VITE_TALLY_FORM_URL || '';

export function hasLeadForm() {
  return TALLY_FORM_URL.trim().length > 0;
}

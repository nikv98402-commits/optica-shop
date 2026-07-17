export const TALLY_FORM_URL = import.meta.env.VITE_TALLY_FORM_URL || '';

export function hasLeadForm() {
  return TALLY_FORM_URL.trim().length > 0;
}

export function buildLeadFormUrl(fields: Record<string, string | number | undefined>) {
  if (!hasLeadForm()) return null;
  try {
    const url = new URL(TALLY_FORM_URL);
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && String(value).trim()) {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}

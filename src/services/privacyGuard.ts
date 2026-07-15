const forbiddenKeyPatterns = [
  /photo/i,
  /image/i,
  /base64/i,
  /sph/i,
  /cyl/i,
  /axis/i,
  /complaint/i,
  /symptom/i,
  /recipe/i,
  /prescription/i,
  /birth/i,
  /^age$/i,
  /birthDate/i,
  /dateOfBirth/i,
  /medical/i,
  /health/i,
  /latitude/i,
  /longitude/i,
  /^lat$/i,
  /^lng$/i,
];

function hasForbiddenKey(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = hasForbiddenKey(item);
      if (nested) return nested;
    }
    return null;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenKeyPatterns.some((pattern) => pattern.test(key))) return key;
    const nested = hasForbiddenKey(nestedValue);
    if (nested) return nested;
  }

  return null;
}

export function assertBackendPayloadSafe(payload: unknown) {
  const forbiddenKey = hasForbiddenKey(payload);
  if (forbiddenKey) {
    throw new Error(`Payload contains forbidden privacy field: ${forbiddenKey}`);
  }
}

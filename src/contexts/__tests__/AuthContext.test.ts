import { describe, expect, it } from 'vitest';
import { createSignUpPayload } from '../authHelpers';

describe('Supabase signup payload', () => {
  it('normalizes identity fields and includes the selected locale', () => {
    expect(createSignUpPayload(' USER@Example.COM ', 'secret12', ' Alice ', 'en')).toEqual({
      email: 'user@example.com',
      password: 'secret12',
      options: { data: { full_name: 'Alice', locale: 'en' } },
    });
  });
});

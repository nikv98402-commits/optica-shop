import { describe,expect,it } from 'vitest';
import { passportProfileCopy } from '../copy';
describe('passport/profile copy',()=>{it('keeps complete RU and EN surface labels',()=>{expect(passportProfileCopy.ru.passport.title).toMatch(/[А-Яа-я]/);expect(passportProfileCopy.en.passport.title).toBe('Your history stays with you');expect(Object.keys(passportProfileCopy.ru.profile)).toEqual(Object.keys(passportProfileCopy.en.profile));expect(Object.values(passportProfileCopy.ru.passport)).not.toContain('created');expect(Object.values(passportProfileCopy.ru.profile)).not.toContain('current')})});

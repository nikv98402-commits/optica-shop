import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Lock, Mail, User, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
}

export function AuthModal({ isOpen, onClose, mode: initialMode }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { language } = useLanguage();
  const t = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [initialMode, isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const dialog = dialogRef.current;
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const getFocusableElements = () => Array.from(
      dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
    ).filter((element) => !element.hasAttribute('hidden'));

    emailRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === firstElement || !dialog.contains(activeElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isSignup = mode === 'signup';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const result = isSignup
        ? await signUp(email, password, name, language)
        : await signIn(email, password);

      if (result.error) {
        setError(t.auth.errors[result.error.code]);
        return;
      }

      if (result.confirmationRequired) {
        setNotice(t.auth.confirmationRequired);
        setPassword('');
        return;
      }

      setName('');
      setEmail('');
      setPassword('');
      onClose();
    } catch {
      setError(t.auth.errors.unexpected);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-vilu-ink/80 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" tabIndex={-1} className="relative w-full max-w-lg overflow-hidden rounded-[2rem] bg-vilu-paper p-7 shadow-2xl shadow-vilu-ink/30 ring-1 ring-vilu-lime/20 md:p-9">
        <button aria-label={t.dashboard.close} onClick={onClose} className="absolute right-6 top-6 rounded-full bg-vilu-card p-3 text-vilu-ink ring-1 ring-vilu-ink/10 transition hover:bg-vilu-lime">
          <X size={18} />
        </button>

        <div className="mb-7 pr-12">
          <div className="mb-4 inline-flex rounded-full bg-vilu-lime p-3 text-vilu-ink">
            <Eye size={24} />
          </div>
          <p className="kinetic-label text-vilu-green">{t.header.visionHub}</p>
          <h2 id="auth-modal-title" className="mt-2 text-4xl font-black tracking-tight">
            {isSignup ? t.auth.createAccount : t.auth.welcomeBack}
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-vilu-ink/65">
            {isSignup ? t.auth.signUpDesc : t.auth.signInDesc}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-vilu-ink/40">{t.auth.name}</span>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-vilu-green" size={18} />
                <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-vilu-ink/10 bg-vilu-card py-4 pl-12 pr-4 font-bold outline-none transition focus:border-vilu-lime" placeholder={t.auth.namePlaceholder} />
              </div>
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-vilu-ink/40">{t.auth.email}</span>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-vilu-green" size={18} />
              <input ref={emailRef} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-2xl border border-vilu-ink/10 bg-vilu-card py-4 pl-12 pr-4 font-bold outline-none transition focus:border-vilu-lime" placeholder="demo@vilu.store" />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-vilu-ink/40">{t.auth.password}</span>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-vilu-green" size={18} />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className="w-full rounded-2xl border border-vilu-ink/10 bg-vilu-card py-4 pl-12 pr-4 font-bold outline-none transition focus:border-vilu-lime" placeholder={t.auth.passwordHint} />
            </div>
          </label>

          {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
          {notice && <div className="rounded-2xl bg-vilu-lime/15 p-4 text-sm font-semibold text-vilu-green" role="status">{notice}</div>}

          <button disabled={loading} className="w-full rounded-full bg-vilu-ink px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-vilu-paper transition hover:bg-vilu-lime hover:text-vilu-ink disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? t.auth.processing : isSignup ? t.auth.createBtn : t.auth.signInBtn}
          </button>
        </form>

        <div className="mt-6 text-center text-sm font-semibold text-vilu-ink/60">
          {isSignup ? t.auth.alreadyHaveAccount : t.auth.dontHaveAccount}{' '}
          <button onClick={() => { setError(''); setNotice(''); setMode(isSignup ? 'login' : 'signup'); }} className="font-black text-vilu-green hover:underline">
            {isSignup ? t.auth.signInBtn : t.auth.signUp}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

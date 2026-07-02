import { FormEvent, useEffect, useState } from 'react';
import { Eye, Lock, Mail, User, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const isSignup = mode === 'signup';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = isSignup
        ? await signUp(email, password, name)
        : await signIn(email, password);

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setName('');
      setEmail('');
      setPassword('');
      onClose();
    } catch {
      setError('Не удалось завершить вход. Проверьте данные и попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-vilu-ink/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] bg-vilu-paper p-7 shadow-2xl shadow-vilu-ink/30 ring-1 ring-vilu-lime/20 md:p-9">
        <button onClick={onClose} className="absolute right-6 top-6 rounded-full bg-vilu-card p-3 text-vilu-ink ring-1 ring-vilu-ink/10 transition hover:bg-vilu-lime">
          <X size={18} />
        </button>

        <div className="mb-7 pr-12">
          <div className="mb-4 inline-flex rounded-full bg-vilu-lime p-3 text-vilu-ink">
            <Eye size={24} />
          </div>
          <p className="kinetic-label text-vilu-green">Vision profile</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">
            {isSignup ? 'Создать кабинет' : 'Войти в кабинет'}
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-vilu-ink/65">
            {isSignup
              ? 'Создайте demo-кабинет. Данные сохраняются только в браузере и не отправляются на сервер.'
              : 'Введите данные demo-аккаунта, чтобы продолжить работу с локальным профилем зрения.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-vilu-ink/40">Имя</span>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-vilu-green" size={18} />
                <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-vilu-ink/10 bg-vilu-card py-4 pl-12 pr-4 font-bold outline-none transition focus:border-vilu-lime" placeholder="Demo user" />
              </div>
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-vilu-ink/40">Email</span>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-vilu-green" size={18} />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full rounded-2xl border border-vilu-ink/10 bg-vilu-card py-4 pl-12 pr-4 font-bold outline-none transition focus:border-vilu-lime" placeholder="demo@vilu.store" />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-vilu-ink/40">Пароль</span>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-vilu-green" size={18} />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className="w-full rounded-2xl border border-vilu-ink/10 bg-vilu-card py-4 pl-12 pr-4 font-bold outline-none transition focus:border-vilu-lime" placeholder="Минимум 6 символов" />
            </div>
          </label>

          {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

          <button disabled={loading} className="w-full rounded-full bg-vilu-ink px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-vilu-paper transition hover:bg-vilu-lime hover:text-vilu-ink disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Проверяем...' : isSignup ? 'Создать demo-кабинет' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm font-semibold text-vilu-ink/60">
          {isSignup ? 'Уже есть аккаунт?' : 'Еще нет аккаунта?'}{' '}
          <button onClick={() => { setError(''); setMode(isSignup ? 'login' : 'signup'); }} className="font-black text-vilu-green hover:underline">
            {isSignup ? 'Войти' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}

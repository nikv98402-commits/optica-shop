import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup';
}

export function AuthModal({ isOpen, onClose, mode: initialMode }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const t = useTranslation();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      onClose();
      setEmail('');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <h2 className="text-3xl font-serif mb-2">
          {mode === 'login' ? t.auth.welcomeBack : t.auth.createAccount}
        </h2>
        <p className="text-gray-600 mb-8 text-sm">
          {mode === 'login'
            ? t.auth.signInDesc
            : t.auth.signUpDesc}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t.auth.email}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t.auth.password}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-3 hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
          >
            {loading ? t.auth.processing : mode === 'login' ? t.auth.signInBtn : t.auth.createBtn}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          {mode === 'login' ? (
            <p className="text-gray-600">
              {t.auth.dontHaveAccount}{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-gray-900 font-medium hover:underline"
              >
                {t.auth.signUp}
              </button>
            </p>
          ) : (
            <p className="text-gray-600">
              {t.auth.alreadyHaveAccount}{' '}
              <button
                onClick={() => setMode('login')}
                className="text-gray-900 font-medium hover:underline"
              >
                {t.auth.signIn}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

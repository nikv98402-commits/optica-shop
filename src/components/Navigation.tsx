import { Languages, LogOut, MapPin, Menu, ShoppingBag, User, X } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenStores: () => void;
  fittingCount?: number;
}

export function Navigation({ currentPage, onNavigate, onOpenStores, fittingCount = 0 }: NavigationProps) {
  const { language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const targetLanguage = language === 'en' ? 'ru' : 'en';
  const targetLanguageLabel = targetLanguage.toUpperCase();

  const go = (page: string) => {
    setMenuOpen(false);
    onNavigate(page);
  };

  const openStores = () => {
    setMenuOpen(false);
    onOpenStores();
  };

  const navItems = [
    { id: 'tryon', label: language === 'en' ? 'Online try-on' : 'Онлайн-примерка' },
    { id: 'eyecheck', label: language === 'en' ? 'Eye Check' : 'Проверка зрения' },
    { id: 'products', label: language === 'en' ? 'Catalog' : 'Каталог' },
    { id: 'home', label: language === 'en' ? 'About' : 'О бренде' },
  ];

  const labels = {
    stores: language === 'en' ? 'Stores' : 'Салоны',
    tryOn: language === 'en' ? 'Try-on' : 'Примерка',
    dashboard: language === 'en' ? 'Profile' : 'Личный кабинет',
    signOut: language === 'en' ? 'Sign out' : 'Выйти',
    language: language === 'en' ? 'Language' : 'Язык',
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-vilu-paper/10 bg-vilu-ink text-vilu-paper shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <button onClick={() => go('home')} className="text-2xl font-black tracking-[-0.06em] text-vilu-paper">ViLu</button>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => go(item.id)} className={`text-sm font-bold uppercase tracking-[0.18em] transition ${currentPage === item.id ? 'text-vilu-lime' : 'text-vilu-paper/58 hover:text-vilu-paper'}`}>{item.label}</button>
          ))}
          <button onClick={openStores} className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-vilu-paper/58 transition hover:text-vilu-paper"><MapPin size={16} /> {labels.stores}</button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => go('tryon')} className="rounded-full bg-vilu-lime px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-vilu-ink transition hover:bg-vilu-card md:hidden">{labels.tryOn}</button>
          <button data-no-translate="true" onClick={() => setLanguage(targetLanguage)} className="hidden items-center gap-2 rounded-full bg-vilu-paper px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-vilu-ink ring-1 ring-vilu-lime/20 sm:flex" aria-label={`Switch language to ${targetLanguageLabel}`}><Languages size={15} /> {targetLanguageLabel}</button>
          <button onClick={() => go('dashboard')} className="flex items-center gap-2 rounded-full bg-vilu-paper px-3 py-3 text-vilu-ink ring-1 ring-vilu-lime/20 transition hover:bg-vilu-lime md:px-4">
            <User size={18} />
            {user && <span className="hidden max-w-28 truncate text-xs font-black md:inline">{user.name}</span>}
          </button>
          {user && (
            <button onClick={() => signOut()} className="hidden rounded-full bg-vilu-paper p-3 text-vilu-ink/55 ring-1 ring-vilu-lime/20 transition hover:text-vilu-ink md:block" title={labels.signOut}>
              <LogOut size={18} />
            </button>
          )}
          <button onClick={() => go('checkout')} className="relative rounded-full bg-vilu-lime p-3 text-vilu-ink transition hover:bg-vilu-card"><ShoppingBag size={18} />{fittingCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-vilu-paper text-[10px] font-black text-vilu-ink">{fittingCount}</span>}</button>
          <button onClick={() => setMenuOpen((value) => !value)} className="rounded-full bg-vilu-paper p-3 text-vilu-ink ring-1 ring-vilu-lime/20 md:hidden">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-vilu-paper/10 bg-vilu-ink px-6 py-5 md:hidden">
          <div className="grid gap-3">
            <button onClick={() => go('tryon')} className="rounded-2xl bg-vilu-lime p-4 text-left font-bold text-vilu-ink">{navItems[0].label}</button>
            <button onClick={() => go('eyecheck')} className="rounded-2xl bg-vilu-paper p-4 text-left font-bold text-vilu-ink">{navItems[1].label}</button>
            <button onClick={() => go('products')} className="rounded-2xl bg-vilu-paper p-4 text-left font-bold text-vilu-ink">{navItems[2].label}</button>
            <button onClick={openStores} className="rounded-2xl bg-vilu-paper p-4 text-left font-bold text-vilu-ink">{language === 'en' ? 'Our stores' : 'Наши салоны'}</button>
            <button onClick={() => go('dashboard')} className="rounded-2xl bg-vilu-paper p-4 text-left font-bold text-vilu-ink">{labels.dashboard}</button>
            <button onClick={() => go('home')} className="rounded-2xl bg-vilu-paper p-4 text-left font-bold text-vilu-ink">{navItems[3].label}</button>
            <button data-no-translate="true" onClick={() => setLanguage(targetLanguage)} className="rounded-2xl bg-vilu-paper p-4 text-left font-bold uppercase text-vilu-ink">{labels.language}: {targetLanguageLabel}</button>
            {user && <button onClick={() => signOut()} className="rounded-2xl bg-vilu-lime p-4 text-left font-bold text-vilu-ink">{labels.signOut}</button>}
          </div>
        </div>
      )}
    </nav>
  );
}

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

  const go = (page: string) => {
    setMenuOpen(false);
    onNavigate(page);
  };

  const openStores = () => {
    setMenuOpen(false);
    onOpenStores();
  };

  const navItems = [
    { id: 'tryon', label: 'Онлайн-примерка' },
    { id: 'products', label: 'Каталог' },
    { id: 'home', label: 'О бренде' },
  ];

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-900/10 bg-[#fffaf2]/86 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <button onClick={() => go('home')} className="text-2xl font-black tracking-[-0.08em] text-slate-950">ViLu</button>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => go(item.id)} className={`text-sm font-bold uppercase tracking-[0.18em] transition ${currentPage === item.id ? 'text-[#315c56]' : 'text-slate-500 hover:text-slate-950'}`}>{item.label}</button>
          ))}
          <button onClick={openStores} className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-950"><MapPin size={16} /> Салоны</button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => go('tryon')} className="rounded-full bg-[#f5b25f] px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-white md:hidden">Примерка</button>
          <button onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')} className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ring-1 ring-slate-900/10 sm:flex"><Languages size={15} /> {language}</button>
          <button onClick={() => go('dashboard')} className="flex items-center gap-2 rounded-full bg-white px-3 py-3 ring-1 ring-slate-900/10 transition hover:bg-stone-100 md:px-4">
            <User size={18} />
            {user && <span className="hidden max-w-28 truncate text-xs font-black md:inline">{user.name}</span>}
          </button>
          {user && (
            <button onClick={() => signOut()} className="hidden rounded-full bg-white p-3 text-slate-500 ring-1 ring-slate-900/10 transition hover:text-slate-950 md:block" title="Выйти">
              <LogOut size={18} />
            </button>
          )}
          <button onClick={() => go('checkout')} className="relative rounded-full bg-slate-950 p-3 text-white transition hover:bg-[#315c56]"><ShoppingBag size={18} />{fittingCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f5b25f] text-[10px] font-black text-slate-950">{fittingCount}</span>}</button>
          <button onClick={() => setMenuOpen((value) => !value)} className="rounded-full bg-white p-3 ring-1 ring-slate-900/10 md:hidden">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-900/10 bg-[#fffaf2] px-6 py-5 md:hidden">
          <div className="grid gap-3">
            <button onClick={() => go('tryon')} className="rounded-2xl bg-slate-950 p-4 text-left font-bold text-white">Онлайн-примерка</button>
            <button onClick={() => go('products')} className="rounded-2xl bg-white p-4 text-left font-bold">Каталог</button>
            <button onClick={openStores} className="rounded-2xl bg-white p-4 text-left font-bold">Наши салоны</button>
            <button onClick={() => go('dashboard')} className="rounded-2xl bg-white p-4 text-left font-bold">Личный кабинет</button>
            <button onClick={() => go('home')} className="rounded-2xl bg-white p-4 text-left font-bold">О бренде</button>
            {user && <button onClick={() => signOut()} className="rounded-2xl bg-slate-950 p-4 text-left font-bold text-white">Выйти</button>}
          </div>
        </div>
      )}
    </nav>
  );
}

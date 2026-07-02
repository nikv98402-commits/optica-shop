import React, { useState } from 'react';
import { PlusCircle, Package, ArrowLeft, LayoutGrid, FileJson, UploadCloud, AlertCircle } from 'lucide-react';

interface AdminProps {
  onBack: () => void;
}

interface AdminProduct {
  id: string;
  name: string;
  price: string;
  brand?: string;
  category?: string;
  image: string;
  description?: string;
}

function normalizeProduct(value: unknown): AdminProduct {
  const product = value && typeof value === 'object' ? value as Partial<AdminProduct> : {};
  return {
    id: product.id || Math.random().toString(36).substr(2, 9),
    name: product.name || '',
    price: String(product.price || ''),
    brand: product.brand || '',
    category: product.category || 'lenses',
    image: product.image || '',
    description: product.description || '',
  };
}

export function Admin({ onBack }: AdminProps) {
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    brand: '',
    category: 'lenses',
    image: '',
    description: '',
  });

  // Список товаров, добавленных за текущую сессию
  const [recentProducts, setRecentProducts] = useState<AdminProduct[]>([]);

  // МАССОВЫЙ ЗАГРУЗЧИК: Обработка JSON файла
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Если в файле массив — берем его, если один объект — оборачиваем в массив
        const productsToAdd = Array.isArray(json) ? json : [json];
        
        // Добавляем ID каждому новому товару из файла
        const formattedProducts = productsToAdd.map(normalizeProduct);

        setRecentProducts(prev => [...formattedProducts, ...prev]);
        alert(`Успешно импортировано: ${formattedProducts.length} товаров`);
      } catch {
        alert("Ошибка! Проверьте формат JSON-файла. Он должен содержать массив объектов.");
      }
    };
    reader.readAsText(file);
    // Сбрасываем значение input, чтобы можно было загрузить тот же файл повторно
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productEntry: AdminProduct = { ...newProduct, id: Date.now().toString() };
    setRecentProducts([productEntry, ...recentProducts]);
    alert(`Товар "${newProduct.name}" добавлен!`);
    
    setNewProduct({
      name: '', price: '', brand: '', category: 'lenses', image: '', description: '',
    });
  };

  return (
    <div className="min-h-screen bg-vilu-paper pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Верхняя панель */}
        <div className="flex justify-between items-center mb-12">
          <button
            onClick={onBack}
            className="flex items-center text-sm font-bold text-vilu-ink/42 hover:text-vilu-ink transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" /> На главную
          </button>
          <div className="flex items-center gap-3 bg-vilu-card px-6 py-3 rounded-2xl shadow-sm border border-vilu-line">
             <div className="w-2 h-2 bg-vilu-lime rounded-full animate-pulse" />
             <span className="text-xs font-bold uppercase tracking-widest text-vilu-ink/55">Stock Manager Mode</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <h1 className="text-4xl font-black tracking-tight text-vilu-ink">Управление товарами</h1>

            {/* СЕКЦИЯ: МАССОВАЯ ЗАГРУЗКА */}
            <div className="bg-vilu-ink rounded-[2rem] p-8 text-vilu-paper shadow-xl shadow-vilu-ink/20 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="bg-vilu-paper/10 p-4 rounded-2xl backdrop-blur-md">
                  <FileJson size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-xl tracking-tight">Массовый импорт</h3>
                  <p className="text-vilu-paper/70 text-sm">Загрузите каталог в формате .json</p>
                </div>
              </div>
              <label className="bg-vilu-lime text-vilu-ink px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] cursor-pointer hover:bg-vilu-card transition-all active:scale-95 text-center w-full md:w-auto">
                Выбрать JSON-файл
                <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            {/* ФОРМА: РУЧНОЕ ДОБАВЛЕНИЕ */}
            <div className="bg-vilu-card p-10 rounded-[2rem] shadow-sm border border-vilu-line">
              <div className="flex items-center gap-3 mb-8">
                <PlusCircle className="text-vilu-green" size={24} />
                <h3 className="text-2xl font-black tracking-tight">Добавить вручную</h3>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-vilu-ink/42 ml-1">Название модели</label>
                    <input
                      placeholder="Напр: Ray-Ban Aviator"
                      className="w-full p-4 bg-vilu-paper rounded-2xl outline-none border-2 border-transparent focus:border-vilu-lime focus:bg-vilu-card transition-all font-medium"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-vilu-ink/42 ml-1">Цена продажи (₽)</label>
                    <input
                      placeholder="12000"
                      type="number"
                      className="w-full p-4 bg-vilu-paper rounded-2xl outline-none border-2 border-transparent focus:border-vilu-lime focus:bg-vilu-card transition-all font-medium"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-vilu-ink/42 ml-1">Прямая ссылка на фото</label>
                  <div className="relative">
                    <input
                      placeholder="https://images.unsplash.com/..."
                      className="w-full p-4 bg-vilu-paper rounded-2xl outline-none border-2 border-transparent focus:border-vilu-lime focus:bg-vilu-card transition-all font-medium pr-12"
                      value={newProduct.image}
                      onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                      required
                    />
                    <UploadCloud className="absolute right-4 top-4 text-vilu-ink/30" size={20} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-vilu-ink text-vilu-paper py-5 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs hover:bg-vilu-lime hover:text-vilu-ink transition-all shadow-lg"
                >
                  Опубликовать товар
                </button>
              </form>
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА: Очередь загрузки */}
          <div className="space-y-6">
            <div className="bg-vilu-card p-8 rounded-[2rem] shadow-sm border border-vilu-line sticky top-32">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <LayoutGrid size={20} className="text-vilu-green" /> Очередь
                </h3>
                <span className="bg-vilu-lime/20 text-vilu-ink px-3 py-1 rounded-full text-[10px] font-black italic">
                  {recentProducts.length} POS
                </span>
              </div>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {recentProducts.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-vilu-line rounded-3xl">
                    <AlertCircle className="mx-auto text-vilu-ink/20 mb-3" size={32} />
                    <p className="text-vilu-ink/42 text-xs font-medium px-4">Список пуст. Используйте форму или импорт.</p>
                  </div>
                ) : (
                  recentProducts.map((p) => (
                    <div
                      key={p.id}
                      className="group flex items-center gap-4 p-4 bg-vilu-paper rounded-2xl border border-transparent hover:border-vilu-lime/40 hover:bg-vilu-card transition-all"
                    >
                      <div className="w-12 h-12 bg-vilu-card rounded-xl overflow-hidden border border-vilu-line flex-shrink-0">
                        {p.image ? (
                          <img src={p.image} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-vilu-paper">
                            <Package className="text-vilu-ink/30" size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-vilu-ink truncate uppercase tracking-tight">{p.name}</p>
                        <p className="text-[10px] font-black text-vilu-green mt-0.5">{p.price} ₽</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

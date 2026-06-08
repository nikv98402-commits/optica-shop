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
    <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Верхняя панель */}
        <div className="flex justify-between items-center mb-12">
          <button
            onClick={onBack}
            className="flex items-center text-sm font-bold text-gray-400 hover:text-black transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" /> На главную
          </button>
          <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
             <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Stock Manager Mode</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <h1 className="text-4xl font-serif text-gray-900">Управление товарами</h1>

            {/* СЕКЦИЯ: МАССОВАЯ ЗАГРУЗКА */}
            <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-200 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                  <FileJson size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-xl tracking-tight">Массовый импорт</h3>
                  <p className="text-blue-100 text-sm opacity-80">Загрузите каталог в формате .json</p>
                </div>
              </div>
              <label className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] cursor-pointer hover:bg-blue-50 transition-all active:scale-95 text-center w-full md:w-auto">
                Выбрать JSON-файл
                <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            {/* ФОРМА: РУЧНОЕ ДОБАВЛЕНИЕ */}
            <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <PlusCircle className="text-blue-600" size={24} />
                <h3 className="font-serif text-2xl">Добавить вручную</h3>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Название модели</label>
                    <input
                      placeholder="Напр: Ray-Ban Aviator"
                      className="w-full p-4 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-medium"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Цена продажи (₽)</label>
                    <input
                      placeholder="12000"
                      type="number"
                      className="w-full p-4 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-medium"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Прямая ссылка на фото</label>
                  <div className="relative">
                    <input
                      placeholder="https://images.unsplash.com/..."
                      className="w-full p-4 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-medium pr-12"
                      value={newProduct.image}
                      onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                      required
                    />
                    <UploadCloud className="absolute right-4 top-4 text-gray-300" size={20} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-black text-white py-5 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-100"
                >
                  Опубликовать товар
                </button>
              </form>
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА: Очередь загрузки */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 sticky top-32">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-serif flex items-center gap-2">
                  <LayoutGrid size={20} className="text-blue-600" /> Очередь
                </h3>
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black italic">
                  {recentProducts.length} POS
                </span>
              </div>
              
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {recentProducts.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-3xl">
                    <AlertCircle className="mx-auto text-gray-200 mb-3" size={32} />
                    <p className="text-gray-400 text-xs font-medium px-4">Список пуст. Используйте форму или импорт.</p>
                  </div>
                ) : (
                  recentProducts.map((p) => (
                    <div
                      key={p.id}
                      className="group flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-white transition-all"
                    >
                      <div className="w-12 h-12 bg-white rounded-xl overflow-hidden border border-gray-100 flex-shrink-0">
                        {p.image ? (
                          <img src={p.image} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <Package className="text-gray-300" size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate uppercase tracking-tight">{p.name}</p>
                        <p className="text-[10px] font-black text-blue-600 mt-0.5">{p.price} ₽</p>
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

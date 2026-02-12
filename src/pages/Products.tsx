import { useEffect, useState, useCallback } from 'react';
import { Truck, CheckCircle2, Loader2, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

interface ProductsProps {
  onNavigate: (page: string, productId?: string) => void;
  fittingCart: string[];
  onToggleFitting: (id: string) => void;
}

export function Products({
  onNavigate,
  fittingCart = [], 
  onToggleFitting,
}: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [onlyFitting, setOnlyFitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;
      setProducts(data || []);
    } catch (err: any) {
      console.error('Ошибка загрузки данных:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const applyFilters = () => {
      // Гарантируем, что работаем с массивом
      let filtered = Array.isArray(products) ? [...products] : [];

      if (categoryFilter !== 'all') {
        filtered = filtered.filter((p) => p.category === categoryFilter);
      }

      if (brandFilter !== 'all') {
        filtered = filtered.filter((p) => p.brand_type === brandFilter);
      }

      if (onlyFitting) {
        filtered = filtered.filter((p) => p.category !== 'contact_lenses');
      }

      setFilteredProducts(filtered);
    };

    applyFilters();
  }, [products, categoryFilter, brandFilter, onlyFitting]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-gray-500 animate-pulse font-medium">Загружаем коллекцию...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center bg-red-50 p-8 border border-red-100 rounded-2xl max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Ошибка подключения</h2>
          <p className="text-gray-600 mb-6 text-sm">{error}</p>
          <button
            onClick={() => loadProducts()}
            className="px-8 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all font-bold uppercase text-xs tracking-widest"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-50 py-16 px-6 border-b border-gray-200">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-serif mb-4 text-gray-900 uppercase tracking-tight">Каталог оптики</h1>
          <p className="text-gray-600 max-w-xl mx-auto italic">
            Премиальные бренды и собственная линия оправ с бесплатной доставкой в наши салоны.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-12">
          <aside className="md:w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-8">
               <button
                onClick={() => setOnlyFitting(!onlyFitting)}
                className={`w-full flex items-center justify-between p-4 border transition-all rounded-lg ${
                  onlyFitting ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400'
                }`}
              >
                <span className="text-sm font-bold uppercase tracking-tighter">Тест-драйв оправы</span>
                {onlyFitting ? <CheckCircle2 size={16} /> : <Truck size={16} className="text-gray-400" />}
              </button>
              
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Категории</h4>
                <div className="flex flex-col gap-3">
                  {[
                    {id: 'all', name: 'Все товары'}, 
                    {id: 'sunglasses', name: 'Солнцезащитные'}, 
                    {id: 'eyeglasses', name: 'Оправы'}, 
                    {id: 'contact_lenses', name: 'Линзы'}
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`text-left text-sm transition-colors ${categoryFilter === cat.id ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-black'}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
                <MapPin size={20} className="text-blue-600 mb-2" />
                <p className="text-[11px] text-blue-800 font-bold leading-relaxed">
                  Бесплатная примерка до 5 моделей в любом из наших салонов.
                </p>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Найдено моделей: {filteredProducts?.length || 0}
              </span>
              {(Array.isArray(fittingCart) && fittingCart.length > 0) && (
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                   <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                    Для примерки: {fittingCart.length} / 5
                  </span>
                </div>
              )}
            </div>

            {(!filteredProducts || filteredProducts.length === 0) ? (
              <div className="text-center py-32 border-2 border-dashed border-gray-100 rounded-3xl">
                <p className="text-gray-400 font-serif text-xl italic">В этой категории пока пусто</p>
                <button onClick={() => setCategoryFilter('all')} className="mt-4 text-blue-600 text-sm underline font-bold">Сбросить фильтры</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="group relative">
                    <div 
                      onClick={() => onNavigate('product', product.id)}
                      className="aspect-[3/4] bg-gray-50 mb-4 cursor-pointer overflow-hidden rounded-sm transition-transform duration-500 group-hover:scale-[1.01]"
                    >
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-full h-full object-cover mix-blend-multiply" 
                        loading="lazy"
                      />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-serif text-lg text-gray-900 leading-tight">{product.name}</h3>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 font-bold">
                          {product.brand_name || 'VisionLux'}
                        </p>
                      </div>
                      <p className="font-bold text-gray-900 whitespace-nowrap">
                        {Math.round(product.price * 95).toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                    
                    <div className="flex gap-2 mt-5 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         onClick={() => onNavigate('product', product.id)} 
                         className="flex-1 border border-gray-200 py-3 text-[9px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                       >
                         Детали
                       </button>
                       {product.category !== 'contact_lenses' && (
                         <button 
                           onClick={() => onToggleFitting(product.id)}
                           className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-widest transition-all ${
                             fittingCart?.includes(product.id) 
                             ? 'bg-blue-600 text-white border-blue-600' 
                             : 'bg-gray-100 text-gray-900 border-transparent hover:bg-gray-200'
                           }`}
                         >
                           {fittingCart?.includes(product.id) ? 'В списке' : 'Примерить'}
                         </button>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
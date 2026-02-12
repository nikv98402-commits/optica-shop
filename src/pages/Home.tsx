import { useEffect, useState } from 'react';
import { ArrowRight, Eye, Calendar, Glasses } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface HomeProps {
  onNavigate: (page: string, productId?: string) => void;
}

export function Home({ onNavigate }: HomeProps) {
  const [featuredSunglasses, setFeaturedSunglasses] = useState<Product[]>([]);
  const [featuredLenses, setFeaturedLenses] = useState<Product[]>([]);
  const t = useTranslation();

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    const { data: sunglasses } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'sunglasses')
      .eq('featured', true)
      .limit(3);

    const { data: lenses } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'contact_lenses')
      .eq('featured', true)
      .limit(1);

    if (sunglasses) setFeaturedSunglasses(sunglasses);
    if (lenses) setFeaturedLenses(lenses);
  };

  return (
    <div className="bg-white">
      <section className="relative min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-4xl mx-auto px-6 py-32">
          <h1 className="text-6xl md:text-7xl font-serif mb-8 tracking-tight text-gray-900">
            {t.home.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-16 leading-relaxed max-w-2xl mx-auto">
            {t.home.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={() => onNavigate('products')}
              className="bg-gray-900 text-white px-10 py-4 hover:bg-gray-800 transition-colors font-medium tracking-wide"
            >
              {t.home.shopCollection}
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('vision-hub');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="border-2 border-gray-900 text-gray-900 px-10 py-4 hover:bg-gray-900 hover:text-white transition-colors font-medium tracking-wide"
            >
              {t.home.exploreVisionHub}
            </button>
          </div>
        </div>
      </section>

      <section className="py-32 px-6 border-t border-gray-300">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-serif mb-6 text-gray-900">{t.home.sunglassesTitle}</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              {t.home.sunglassesDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            {featuredSunglasses.map((product) => (
              <div
                key={product.id}
                onClick={() => onNavigate('product', product.id)}
                className="group cursor-pointer"
              >
                <div className="aspect-square bg-gray-100 overflow-hidden mb-6">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="font-serif text-xl mb-3 text-gray-900">{product.name}</h3>
                <p className="text-gray-600 mb-3 text-sm leading-relaxed">{product.description}</p>
                <p className="text-lg font-medium text-gray-900">${product.price}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={() => onNavigate('products')}
              className="inline-flex items-center space-x-3 text-gray-900 hover:text-gray-600 transition-colors group font-medium"
            >
              <span>{t.home.viewAll}</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      <section id="vision-hub" className="bg-gray-50 py-32 px-6 border-t border-gray-300">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-5xl md:text-6xl font-serif mb-8 text-gray-900">{t.home.visionHubTitle}</h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-12">
                {t.home.visionHubDesc}
              </p>
              <div className="space-y-8">
                <div className="flex items-start space-x-5">
                  <div className="flex-shrink-0 mt-1">
                    <Glasses className="text-gray-900" size={28} />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg mb-2 text-gray-900">{t.home.premiumLenses}</h3>
                    <p className="text-gray-600">{t.home.premiumLensesDesc}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-5">
                  <div className="flex-shrink-0 mt-1">
                    <Eye className="text-gray-900" size={28} />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg mb-2 text-gray-900">{t.home.visionProfile}</h3>
                    <p className="text-gray-600">{t.home.visionProfileDesc}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-5">
                  <div className="flex-shrink-0 mt-1">
                    <Calendar className="text-gray-900" size={28} />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg mb-2 text-gray-900">{t.home.expertSupport}</h3>
                    <p className="text-gray-600">{t.home.expertSupportDesc}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-12 shadow-xl">
              {featuredLenses.length > 0 && (
                <div className="mb-10">
                  <img
                    src={featuredLenses[0].image_url}
                    alt={featuredLenses[0].name}
                    className="w-full h-72 object-cover mb-8"
                  />
                  <h3 className="font-serif text-2xl mb-3 text-gray-900">{featuredLenses[0].name}</h3>
                  <p className="text-gray-600 mb-6 text-sm">{featuredLenses[0].description}</p>
                </div>
              )}
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-6 border-b border-gray-200">
                  <span className="text-gray-600">{t.home.oneTimePurchase}</span>
                  <span className="text-2xl font-serif text-gray-900">${featuredLenses[0]?.price || 30}</span>
                </div>
                <div className="bg-gray-900 text-white p-8">
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-lg">{t.home.monthlySubscription}</span>
                      <span className="text-2xl font-serif">${featuredLenses[0]?.subscription_price || 25}</span>
                    </div>
                    <p className="text-sm text-gray-300">{t.home.includesVisionHub}</p>
                  </div>
                  <button
                    onClick={() => featuredLenses[0] && onNavigate('product', featuredLenses[0].id)}
                    className="w-full bg-white text-gray-900 py-4 hover:bg-gray-100 transition-colors font-medium mt-6"
                  >
                    {t.home.getStartedBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 px-6 text-center border-t border-gray-300">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-serif mb-8 text-gray-900">{t.home.experienceDifference}</h2>
          <p className="text-gray-600 text-lg mb-12">
            {t.home.experienceDifferenceDesc}
          </p>
          <button
            onClick={() => onNavigate('products')}
            className="bg-gray-900 text-white px-10 py-4 hover:bg-gray-800 transition-colors font-medium text-lg tracking-wide"
          >
            {t.home.startShopping}
          </button>
        </div>
      </section>
    </div>
  );
}

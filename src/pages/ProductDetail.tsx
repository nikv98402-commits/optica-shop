import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';

interface ProductDetailProps {
  productId: string;
  onNavigate: (page: string) => void;
}

export function ProductDetail({ productId, onNavigate }: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [purchaseType, setPurchaseType] = useState<'one-time' | 'subscription'>('one-time');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (data) {
      setProduct(data);
      if (data.subscription_price) {
        setPurchaseType('subscription');
      }
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      alert('Please sign in to make a purchase');
      return;
    }

    setLoading(true);

    if (purchaseType === 'subscription' && product) {
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          product_id: product.id,
          plan_type: 'monthly',
          status: 'active',
          price: product.subscription_price || product.price,
          next_billing_date: nextBillingDate.toISOString(),
        });

      if (error) {
        alert('Error creating subscription: ' + error.message);
      } else {
        alert('Subscription activated successfully!');
        onNavigate('dashboard');
      }
    } else {
      alert('One-time purchase functionality would be integrated with a payment processor');
    }

    setLoading(false);
  };

  const t = useTranslation();

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const showSubscriptionToggle = product.category === 'contact_lenses' && product.subscription_price;
  const savings = product.price - (product.subscription_price || 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-16 border-b border-gray-300">
        <button
          onClick={() => onNavigate('products')}
          className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 group font-medium"
        >
          <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
          <span>{t.productDetail.backToProducts}</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <div className="aspect-square bg-gray-100 overflow-hidden">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="space-y-10">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">
                {product.brand_name}
              </p>
              <h1 className="text-4xl md:text-5xl font-serif mb-6 text-gray-900">{product.name}</h1>
              <p className="text-gray-600 text-lg leading-relaxed">{product.description}</p>
            </div>

            {showSubscriptionToggle ? (
              <div className="space-y-6">
                <h3 className="font-serif text-2xl text-gray-900">{t.productDetail.choosePlan}</h3>

                <div
                  onClick={() => setPurchaseType('one-time')}
                  className={`border-2 p-8 cursor-pointer transition-all ${
                    purchaseType === 'one-time'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-300 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h4 className="font-serif text-lg text-gray-900">{t.productDetail.oneTimes}</h4>
                        {purchaseType === 'one-time' && (
                          <Check size={24} className="text-gray-900" />
                        )}
                      </div>
                      <p className="text-gray-600 mb-4 text-sm">
                        {t.productDetail.oneCopy}
                      </p>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-center space-x-2"><span>•</span><span>{t.productDetail.oneMonth}</span></li>
                        <li className="flex items-center space-x-2"><span>•</span><span>{t.productDetail.noCommitment}</span></li>
                      </ul>
                    </div>
                    <div className="text-right ml-6 flex-shrink-0">
                      <span className="text-3xl font-serif text-gray-900">${product.price}</span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setPurchaseType('subscription')}
                  className={`border-2 p-8 cursor-pointer transition-all relative ${
                    purchaseType === 'subscription'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 hover:border-gray-600'
                  }`}
                >
                  <div className="absolute -top-4 -right-4">
                    <div className="bg-green-600 text-white px-4 py-2 text-sm font-medium flex items-center space-x-1">
                      <Tag size={16} />
                      <span>{t.productDetail.saveBadge}</span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h4 className={`font-serif text-lg ${purchaseType === 'subscription' ? 'text-white' : 'text-gray-900'}`}>
                          {t.productDetail.monthlyTitle}
                        </h4>
                        {purchaseType === 'subscription' && (
                          <Check size={24} className={purchaseType === 'subscription' ? 'text-white' : 'text-gray-900'} />
                        )}
                      </div>
                      <p className={`mb-4 text-sm ${purchaseType === 'subscription' ? 'text-gray-200' : 'text-gray-600'}`}>
                        {t.productDetail.monthlyCopy.replace('per month', '')}<strong>${savings.toFixed(2)}</strong> {t.productDetail.monthlyCopy.split(' ').slice(1).join(' ')}
                      </p>
                      <ul className={`text-sm space-y-2 ${purchaseType === 'subscription' ? 'text-gray-200' : 'text-gray-600'}`}>
                        {t.productDetail.monthlyBenefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-center space-x-2"><span>•</span><span>{benefit}</span></li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right ml-6 flex-shrink-0">
                      <span className={`text-3xl font-serif ${purchaseType === 'subscription' ? 'text-white' : 'text-gray-900'}`}>
                        ${product.subscription_price}
                      </span>
                      <span className={`text-sm block ${purchaseType === 'subscription' ? 'text-gray-300' : 'text-gray-600'}`}>/month</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-4xl font-serif text-gray-900">${product.price}</span>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <button
                onClick={handlePurchase}
                disabled={loading}
                className={`w-full py-5 hover:opacity-90 transition-opacity text-lg font-medium tracking-wide ${
                  purchaseType === 'subscription' && showSubscriptionToggle
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-900 text-white'
                } disabled:opacity-50`}
              >
                {loading ? t.productDetail.processing : showSubscriptionToggle && purchaseType === 'subscription' ? t.productDetail.startSubscription : t.productDetail.addToCart}
              </button>
              {!user && (
                <p className="text-sm text-gray-600 text-center">
                  {t.productDetail.signInToPurchase}
                </p>
              )}
            </div>

            <div className="pt-8 border-t border-gray-300 space-y-4">
              <h3 className="font-serif text-lg text-gray-900">{t.productDetail.productDetails}</h3>
              <div className="text-gray-600 space-y-3 text-sm">
                <p><span className="text-gray-900 font-medium">Category:</span> {product.category.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</p>
                <p><span className="text-gray-900 font-medium">Brand:</span> {product.brand_name}</p>
                <p><span className="text-gray-900 font-medium">Stock:</span> {product.stock} {t.productDetail.units}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

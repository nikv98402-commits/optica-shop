import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Package, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface CheckoutProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function Checkout({ onBack, onSuccess }: CheckoutProps) {
  const t = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubscription, setIsSubscription] = useState(true);

  // Расчет цен
  const basePrice = 3500;
  const discountAmount = isSubscription ? 525 : 0; 
  const totalAmount = basePrice - discountAmount;

  const handlePayment = () => {
    setIsProcessing(true);
    
    // Имитация задержки платежного шлюза
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(); 
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-8 group"
        >
          <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
          Назад в каталог
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* ФОРМА ОПЛАТЫ */}
          <div className="space-y-8">
            <h1 className="text-3xl font-serif text-gray-900">Оформление</h1>
            
            <div className="space-y-4">
              <div className="p-4 border border-black bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <CreditCard size={24} className="text-gray-900" />
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tight">Карта</p>
                    <p className="text-xs text-gray-500">Любые банки РФ</p>
                  </div>
                </div>
              </div>

              <section className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="text-blue-600 mt-1" size={20} />
                  <div>
                    <p className="text-sm font-bold text-blue-900 mb-1">PCI DSS Secure</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      VisionLux не хранит ваши данные. Платеж проходит через защищенный шлюз.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className={`w-full py-5 rounded-full font-bold uppercase tracking-widest text-sm transition-all shadow-lg ${
                isProcessing 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {isProcessing ? 'Связь с банком...' : `Оплатить ${totalAmount} ₽`}
            </button>
          </div>

          {/* ДЕТАЛИ ЗАКАЗА */}
          <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 h-fit">
            <h3 className="text-lg font-serif mb-6 text-gray-900">Ваш заказ</h3>
            
            <div className="flex gap-4 mb-8">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                <Package className="text-gray-300" size={28} />
              </div>
              <div>
                <p className="text-sm font-bold">Acuvue Oasys Monthly</p>
                <p className="text-xs text-gray-500 italic">Линзы (6 шт.)</p>
              </div>
            </div>

            <div className="space-y-4 border-t border-gray-200 pt-6">
              <div 
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${isSubscription ? 'border-blue-600 bg-blue-50/50' : 'border-transparent bg-white shadow-sm'}`}
                onClick={() => setIsSubscription(!isSubscription)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSubscription ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                      {isSubscription && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="text-sm font-medium">Подписка «Зрение+»</span>
                  </div>
                  <span className="text-xs font-bold text-green-600">-15%</span>
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t border-gray-200 px-2">
                <span className="text-xl font-serif">Итого</span>
                <span className="text-2xl font-serif font-bold">{totalAmount} ₽</span>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3 p-4 bg-white/50 rounded-xl border border-dashed border-gray-300">
              <CheckCircle2 size={16} className="text-green-500" />
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.1em]">
                +1 шаг к бесплатному осмотру у врача
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
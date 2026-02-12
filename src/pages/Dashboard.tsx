import { useState, useEffect } from 'react';
import { Eye, Calendar, Package, Play, CheckCircle2, Stethoscope, TrendingUp } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export function Dashboard() {
  const t = useTranslation();
  const [isTraining, setIsTraining] = useState(false);
  const [timer, setTimer] = useState(30);

  // Данные для системы лояльности (имитация)
  const purchasesCount = 2;
  const goalsToDoctor = 3;
  const progressPercentage = (purchasesCount / goalsToDoctor) * 100;

  // Логика таймера для тренажера
  useEffect(() => {
    let interval: any;
    if (isTraining && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0) {
      setIsTraining(false);
      setTimer(30);
    }
    return () => clearInterval(interval);
  }, [isTraining, timer]);

  return (
    <div className="min-h-screen bg-gray-50/50 pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-12">
          <h1 className="text-4xl font-serif text-gray-900 mb-2">{t.dashboard.title}</h1>
          <p className="text-gray-500 italic">{t.dashboard.subtitle}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ЛЕВАЯ КОЛОНКА (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. ТРЕНАЖЕР ДЛЯ ГЛАЗ */}
            <section className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif flex items-center gap-3">
                  <Eye className="text-blue-600" /> {t.dashboard.eyeExerciseWidget}
                </h2>
                {isTraining && (
                  <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-full">
                    <span className="text-xl font-mono font-bold text-blue-600">
                      00:{timer < 10 ? `0${timer}` : timer}
                    </span>
                  </div>
                )}
              </div>

              <div className={`h-72 border-2 border-dashed rounded-xl flex items-center justify-center transition-all ${
                isTraining ? 'bg-blue-50/30 border-blue-200' : 'bg-gray-50 border-gray-100'
              }`}>
                {!isTraining ? (
                  <div className="text-center px-6">
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                      {t.dashboard.exerciseDesc}
                    </p>
                    <button
                      onClick={() => setIsTraining(true)}
                      className="bg-gray-900 text-white px-10 py-4 flex items-center gap-3 hover:bg-blue-700 transition-all uppercase text-xs font-bold tracking-widest rounded-lg"
                    >
                      <Play size={16} fill="currentColor" /> {t.dashboard.startExercise}
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    {/* Анимированная точка */}
                    <div
                      className="absolute w-8 h-8 bg-blue-600 rounded-full shadow-2xl shadow-blue-400 transition-all duration-300"
                      style={{
                        left: `${50 + 35 * Math.cos(timer * 0.5)}%`,
                        top: `${50 + 25 * Math.sin(timer * 0.8)}%`,
                      }}
                    />
                    <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-blue-800 font-bold uppercase tracking-tighter">
                      Следите за точкой, не двигая головой
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* 2. СИСТЕМА ЛОЯЛЬНОСТИ (ПРОГРЕСС) */}
            <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Stethoscope size={24} />
                  </div>
                  <h3 className="text-xl font-serif">Программа «Здоровое зрение»</h3>
                </div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded">
                  Шаг {purchasesCount} из {goalsToDoctor}
                </span>
              </div>

              <p className="text-gray-600 mb-8 max-w-md">
                Сделайте 3 покупки и получите <b>бесплатный очный прием</b> у офтальмолога.
              </p>

              {/* Шкала */}
              <div className="relative h-4 bg-gray-100 rounded-full mb-4 overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              <div className="flex items-center p-4 bg-green-50 rounded-xl border border-green-100">
                <TrendingUp className="text-green-600 mr-3" size={20} />
                <span className="text-sm text-green-800 font-medium">
                  Еще {goalsToDoctor - purchasesCount} покупка до бесплатного визита!
                </span>
              </div>
            </section>
          </div>

          {/* ПРАВАЯ КОЛОНКА (1/3) */}
          <div className="space-y-8">
            
            {/* СТАТУС ПОДПИСКИ */}
            <section className="bg-gray-900 text-white p-8 rounded-2xl shadow-xl">
              <Package className="mb-6 text-blue-400" size={32} />
              <h2 className="text-xl font-serif mb-2">{t.dashboard.activeSubscriptions}</h2>
              <p className="text-gray-400 text-sm mb-6">Acuvue Oasys Monthly</p>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                  <span className="text-gray-500">{t.dashboard.nextBilling}</span>
                  <span>14 Марта</span>
                </div>
              </div>

              <button className="w-full border border-white/20 py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all">
                Управлять подпиской
              </button>
            </section>

            {/* ЗАПИСЬ К ВРАЧУ */}
            <section className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm">
              <Calendar className="mb-6 text-gray-400" size={32} />
              <h2 className="text-xl font-serif mb-4">Проверка зрения</h2>
              <div className="flex items-start gap-3 mb-8 bg-blue-50 p-4 rounded-xl border-l-4 border-blue-600">
                <CheckCircle2 className="text-blue-600 mt-1" size={18} />
                <p className="text-xs text-blue-900 leading-relaxed">
                  Мы рекомендуем проходить осмотр раз в полгода. Ваш следующий визит: <b>20 февраля</b>.
                </p>
              </div>
              <button className="w-full bg-gray-100 text-gray-900 py-4 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-gray-200 transition-all">
                Записаться в салон
              </button>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
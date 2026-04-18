"use client";

import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import animationData from './offline-animation.json';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function OfflineOverlay() {
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
      <div className="w-64 h-64 md:w-80 md:h-80 mb-4 relative z-10 flex items-center justify-center">
        <Lottie 
          animationData={animationData} 
          loop={true} 
          autoplay={true} 
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-3 tracking-tight">Internet aloqasi yo'q</h2>
      <p className="text-slate-500 font-medium max-w-sm mb-8 leading-relaxed">
        Iltimos, tarmoqqa ulanishni tekshiring va qayta urinib ko'ring. Tarmoq tiklanganda sahifa avtomatik yangilanadi.
      </p>
      
      <button 
        onClick={() => window.location.reload()} 
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95"
      >
        <RefreshCw size={18} className="animate-spin-slow" />
        Qayta yuklash
      </button>
    </div>
  );
}

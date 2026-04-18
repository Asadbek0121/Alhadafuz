"use client";

import React, { useEffect } from 'react';
import Lottie from 'lottie-react';
import animationData from '../../../components/offline-animation.json';
import { RefreshCw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dasturchi uchun xatolik logi:", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="w-64 h-64 md:w-80 md:h-80 mb-2 relative z-10 flex items-center justify-center">
        <Lottie 
          animationData={animationData} 
          loop={true} 
          autoplay={true} 
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-3 tracking-tight">Kutilmagan xatolik yuz berdi</h2>
      <p className="text-slate-500 font-medium max-w-md mb-8 leading-relaxed">
        Kechirasiz, tizimda qandaydir nosozlik yuz berdi. Sahifani qayta yuklash orqali muammoni hal qilishga urinib ko'rishingiz mumkin.
      </p>
      
      <button 
        onClick={() => reset()} 
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95"
      >
        <RefreshCw size={18} />
        Qayta urinib ko'rish
      </button>
    </div>
  );
}

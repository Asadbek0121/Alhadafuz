"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";
import LordIcon from "../ui/LordIcon";

export default function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Longer duration for the "WOW" effect to be appreciated
    const timer = setTimeout(() => {
      setShow(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            scale: 1.5,
            opacity: 0,
            filter: "blur(20px)",
            transition: { duration: 1, ease: [0.7, 0, 0.3, 1] } 
          }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A]"
        >
          {/* 1. Dynamic Mesh Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                x: [0, 50, 0],
                y: [0, -30, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/20 blur-[120px] rounded-full"
            />
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                x: [0, -40, 0],
                y: [0, 40, 0],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-indigo-600/20 blur-[120px] rounded-full"
            />
          </div>

          {/* 2. Main Content Container */}
          <div className="relative z-10 flex flex-col items-center">
            
            {/* Animated Icon from Lordicon */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="mb-4"
            >
              <LordIcon 
                src="/icons/lordicon/delivery.json"
                trigger="loop"
                size={80}
                colors="primary:#ffffff,secondary:#3b82f6"
                stroke="25"
              />
            </motion.div>

            {/* Logo Ring (Radial Progress) */}
            <div className="relative w-32 h-32 md:w-48 md:h-48 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <motion.circle
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                  cx="50%"
                  cy="50%"
                  r="48%"
                  stroke="url(#gradient)"
                  strokeWidth="2"
                  fill="transparent"
                  className="md:stroke-[3px]"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#818CF8" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Logo with Floating Effect */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                    type: "spring", 
                    stiffness: 100, 
                    damping: 20,
                    delay: 0.2 
                }}
                className="relative z-20 w-20 h-20 md:w-32 md:h-32"
              >
                <Image
                  src="/logo.png"
                  alt="Logo"
                  fill
                  className="object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  priority
                />
              </motion.div>
              
              {/* Outer Glow */}
              <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-4 rounded-full bg-blue-500/10 blur-2xl"
              />
            </div>

            {/* 3. Text Reveal Section */}
            <div className="mt-8 text-center overflow-hidden">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center"
              >
                <h1 className="text-3xl md:text-6xl font-black text-white tracking-widest uppercase">
                  HADAF
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 ml-2">
                    MARKET
                  </span>
                </h1>
                
                <div className="flex items-center gap-3 mt-4">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: 40 }}
                    transition={{ delay: 1.5, duration: 0.8 }}
                    className="h-[1px] bg-white/20"
                  />
                  <motion.p
                    initial={{ opacity: 0, letterSpacing: "0.5em" }}
                    animate={{ opacity: 0.5, letterSpacing: "0.2em" }}
                    transition={{ delay: 1.2, duration: 1 }}
                    className="text-[10px] md:text-sm text-white font-light uppercase"
                  >
                    Sifat va Ishonch
                  </motion.p>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: 40 }}
                    transition={{ delay: 1.5, duration: 0.8 }}
                    className="h-[1px] bg-white/20"
                  />
                </div>
              </motion.div>
            </div>
          </div>

          {/* 4. Elegant Loading Shimmer */}
          <div className="absolute bottom-20 flex flex-col items-center gap-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[8px] md:text-[10px] text-white/40 tracking-[0.3em] font-medium"
            >
              TIZIM TAYYORLANMOQDA
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

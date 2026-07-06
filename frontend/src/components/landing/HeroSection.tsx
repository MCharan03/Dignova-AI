'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Play, Shield, Activity } from 'lucide-react';

/**
 * Cinematic Hero Section - Dignova Sentient OS
 * Full-screen immersive experience with background video and staggered motion reveals.
 */

const BlurIn = ({ children, delay = 0, duration = 0.8 }: { children: React.ReactNode, delay?: number, duration?: number }) => (
  <motion.div
    initial={{ opacity: 0, filter: 'blur(20px)', y: 30 }}
    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
    transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

export function HeroSection() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black flex items-center">
      {/* Background Cinematic Video */}
      <div className="absolute inset-0 z-0">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
        >
          <source 
            src="https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4" 
            type="video/mp4" 
          /> 
        </video>
        {/* Cinematic Vignette & Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)] z-10 opacity-70" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-20 w-full max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 pt-20">
        <div className="max-w-4xl">
          
          {/* Status Badge */}
          <BlurIn delay={0.2}>
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl mb-8 group hover:border-cyan-500/30 transition-colors duration-500">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </div>
              <span className="text-[10px] md:text-xs font-bold text-white/60 uppercase tracking-[0.2em]">
                Sentient OS Layer Active
              </span>
              <div className="w-[1px] h-3 bg-white/20 mx-1" />
              <span className="text-[10px] md:text-xs font-medium text-cyan-400 uppercase tracking-widest group-hover:text-cyan-300 transition-colors">
                v2.0 Deploy
              </span>
            </div>
          </BlurIn>

          {/* Main Headline */}
          <div className="space-y-4 mb-10">
            <BlurIn delay={0.4}>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-[0.95]">
                The Future is <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40 italic font-serif">
                  Autonomous.
                </span>
              </h1>
            </BlurIn>
            <BlurIn delay={0.6}>
              <p className="text-lg md:text-xl text-white/50 max-w-2xl font-light leading-relaxed tracking-wide">
                Dignova AI is a sentient healthcare orchestration layer. We bridge the gap between static care and 
                proactive, hyper-personalized medical intelligence.
              </p>
            </BlurIn>
          </div>

          {/* Action Hub */}
          <BlurIn delay={0.8}>
            <div className="flex flex-wrap gap-6 items-center">
              <button 
                onClick={() => window.location.href = '/login'}
                className="group relative flex items-center gap-4 bg-white text-black pl-8 pr-2 py-2 rounded-full font-bold overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)]"
              >
                <span className="relative z-10 tracking-tight">Initiate Triage</span>
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-black text-white group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={20} />
                </div>
              </button>

              <button 
                className="group flex items-center gap-3 px-8 py-4 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-white font-semibold hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <Play size={18} className="text-cyan-400 fill-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Watch Matrix Replay</span>
              </button>
            </div>
          </BlurIn>

          {/* Infrastructure Stats (Subtle) */}
          <div className="mt-20 flex flex-wrap gap-12 border-t border-white/5 pt-12">
            <BlurIn delay={1.0}>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Activity size={14} />
                  <span className="text-2xl font-bold tracking-tighter">99.9%</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Neural Uptime</p>
              </div>
            </BlurIn>
            <BlurIn delay={1.1}>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white/80">
                  <Shield size={14} />
                  <span className="text-2xl font-bold tracking-tighter">&lt; 200ms</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Asha Latency</p>
              </div>
            </BlurIn>
            <BlurIn delay={1.2}>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white/80">
                  <Sparkles size={14} />
                  <span className="text-2xl font-bold tracking-tighter">∞</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Scalability</p>
              </div>
            </BlurIn>
          </div>
        </div>
      </div>

      {/* Decorative Side Elements */}
      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent opacity-50 hidden lg:block" />
      <div className="absolute left-12 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-30 hidden lg:block" />
      
      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-bold">Scroll to Explore</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-white/20 to-transparent" />
      </motion.div>
    </section>
  );
}

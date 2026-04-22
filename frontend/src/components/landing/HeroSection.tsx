'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import Hls from 'hls.js';

// --- ANIMATION COMPONENTS ---

const BlurIn = ({ children, delay = 0, duration = 0.6 }: { children: React.ReactNode, delay?: number, duration?: number }) => (
  <motion.div
    initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
    transition={{ duration, delay, ease: [0.2, 0.8, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

const SplitText = ({ text, delayOffset = 0 }: { text: string, delayOffset?: number }) => {
  const words = text.split(' ');
  return (
    <div className="flex flex-wrap gap-x-[0.3em]">
      {words.map((word, i) => (
        <div key={i} className="overflow-hidden">
          <motion.span
            className="inline-block"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.6,
              delay: delayOffset + i * 0.08,
              ease: [0.2, 0.8, 0.2, 1]
            }}
          >
            {word}
          </motion.span>
        </div>
      ))}
    </div>
  );
};

// --- EMPTY BACKGROUND (Let 3D Show Through) ---
const HlsVideo = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-transparent">
      {/* Background is now handled by GlobalCanvas */}
    </div>
  );
};

// --- MAIN HERO SECTION ---

export function HeroSection() {
  return (
    <section className="relative flex h-screen w-full items-center overflow-hidden bg-transparent">
      {/* Background Layer */}
      <HlsVideo />

      {/* Content Layer */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col gap-12 max-w-3xl">
          
          {/* Badge & Heading Group */}
          <div className="flex flex-col gap-6">
            <BlurIn>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm shadow-xl">
                <Sparkles className="w-3 h-3 text-white/80" />
                <span className="text-sm font-medium text-white/80 uppercase tracking-wider">New AI Automation Ally</span>
              </div>
            </BlurIn>

            <div className="flex flex-col text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-tight lg:leading-[1.2]">
                <SplitText text="Unlock the Power of AI" />
                <div className="flex flex-wrap gap-x-[0.3em] items-baseline">
                  <SplitText text="for Your" delayOffset={0.4} />
                  <motion.span
                    className="italic serif"
                    style={{ fontFamily: 'Georgia, serif' }}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    Business.
                  </motion.span>
                </div>
              </h1>
            </div>

            <BlurIn delay={0.4}>
              <p className="text-white/80 text-lg md:text-xl font-normal leading-relaxed max-w-xl">
                Our cutting-edge AI platform automates, analyzes, and accelerates your workflows so you can focus on what really matters.
              </p>
            </BlurIn>
          </div>

          {/* CTA Buttons */}
          <BlurIn delay={0.6}>
            <div className="flex flex-wrap gap-4 items-center">
              <button 
                onClick={() => window.location.href = '/book-call'}
                className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                Book A Free Call
                <ArrowRight size={18} />
              </button>
              <button 
                className="bg-white/20 backdrop-blur-md text-white px-8 py-3 rounded-full font-bold border border-white/10 hover:bg-white/30 transition-all shadow-lg"
              >
                Learn now
              </button>
            </div>
          </BlurIn>

        </div>
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';

// --- BLUR IN ANIMATION ---
export const BlurIn = ({ 
  children, 
  delay = 0, 
  duration = 0.6,
  y = 20,
  className = ""
}: { 
  children: React.ReactNode, 
  delay?: number, 
  duration?: number,
  y?: number,
  className?: string
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, filter: 'blur(10px)', y }}
    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
    transition={{ duration, delay, ease: [0.2, 0.8, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

// --- SPLIT TEXT UNVWEILING ---
export const SplitText = ({ 
  text, 
  delayOffset = 0,
  className = "" 
}: { 
  text: string, 
  delayOffset?: number,
  className?: string
}) => {
  const words = text.split(' ');
  return (
    <div className={`flex flex-wrap gap-x-[0.3em] ${className}`}>
      {words.map((word, i) => (
        <div key={i} className="overflow-hidden">
          <motion.span
            className="inline-block"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 0.8,
              delay: delayOffset + i * 0.05,
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

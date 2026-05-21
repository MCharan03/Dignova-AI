'use client';

import React, { useEffect, useState } from 'react';
import { useSentientObserver } from '@/hooks/useSentientObserver';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function SentientObserverWrapper({ children }: { children: React.ReactNode }) {
    const { stress } = useSentientObserver();
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMove);
        return () => window.removeEventListener('mousemove', handleMove);
    }, []);

    return (
        <div className={`relative min-h-screen transition-all duration-700 ${stress > 0.7 ? 'stabilize-aim' : ''}`}>
            {/* Passive Multimodal Awareness Overlay */}
            <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
                {!isLoginPage && (
                    <div 
                        className="neural-glow"
                        style={{ 
                            left: mousePos.x - 200, 
                            top: mousePos.y - 200,
                            opacity: 0.03 + (stress * 0.1),
                            transform: `scale(${1 + (stress * 0.5)})`
                        }}
                    />
                )}

                {/* Scanlines that intensify with stress */}
                <div 
                    className="scanlines absolute inset-0 opacity-10 transition-opacity duration-1000"
                    style={{ opacity: 0.05 + (stress * 0.2) }}
                />

                {/* Vertical Scan Sweep */}
                <div className="scan-sweep absolute inset-0 opacity-20" />

                {/* Vignette that darkens with stress */}
                <div 
                    className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.5)] transition-all duration-1000 pointer-events-none"
                    style={{ 
                        boxShadow: `inset 0 0 ${100 + (stress * 200)}px rgba(0,0,0,${0.3 + (stress * 0.5)})`,
                        borderColor: stress > 0.8 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                        borderWidth: stress > 0.8 ? '4px' : '0px',
                        borderStyle: 'solid'
                    }}
                />
            </div>

            {/* Asynchronous Agency Status (Bottom Ticker) */}
            <div className="fixed bottom-0 left-0 right-0 h-6 bg-black/40 backdrop-blur-md border-t border-white/5 z-[99] flex items-center px-4 overflow-hidden pointer-events-none">
                <div className="ticker-track flex gap-8 items-center whitespace-nowrap">
                    <span className="text-[8px] font-mono text-accent-cyan flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-accent-cyan animate-pulse" />
                        SENTIENT_OS: CORE_STABLE
                    </span>
                    <span className="text-[8px] font-mono text-gray-500 uppercase">
                        Encryption: AES-256-GCM Active
                    </span>
                    <span className="text-[8px] font-mono text-gray-500 uppercase">
                        Neural_Acuity: {stress > 0.5 ? 'BOOSTED' : 'STANDARD'}
                    </span>
                    <span className="text-[8px] font-mono text-accent-magenta uppercase">
                        Intention_Stabilization: {stress > 0.7 ? 'ARMED' : 'IDLE'}
                    </span>
                    {/* Duplicate for seamless loop */}
                    <span className="text-[8px] font-mono text-accent-cyan flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-accent-cyan animate-pulse" />
                        SENTIENT_OS: CORE_STABLE
                    </span>
                </div>
            </div>

            <main className="relative z-10">
                {children}
            </main>
        </div>
    );
}

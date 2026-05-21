'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSentientObserver } from '@/hooks/useSentientObserver';
import { GlassCard } from '@/components/ui/GlassCard';
import { Sparkles, Activity, ShieldAlert, Heart, Zap, CheckCircle } from 'lucide-react';

interface IntentAction {
    id: string;
    type: 'STRESS' | 'VITALS' | 'SECURITY' | 'SYSTEM';
    title: string;
    description: string;
    actionLabel: string;
    icon: React.ReactNode;
    color: string;
}

export default function IntentActionNode() {
    const { stress } = useSentientObserver();
    const [activeActions, setActiveActions] = useState<IntentAction[]>([]);
    const lastTrigger = useRef<number>(0);

    useEffect(() => {
        const now = Date.now();
        // Only evaluate intent changes every 3 seconds to prevent UI jitter
        if (now - lastTrigger.current < 3000) return;
        lastTrigger.current = now;

        setActiveActions(prev => {
            const next = [...prev];
            
            // Stress Protocol (Stable trigger)
            const hasStress = next.some(a => a.id === 'stress-protocol');
            if (stress > 0.7 && !hasStress) {
                next.push({
                    id: 'stress-protocol',
                    type: 'STRESS',
                    title: 'High Jitter Detected',
                    description: 'The OS has detected elevated interaction stress. Suggesting Calm Protocol.',
                    actionLabel: 'Initiate Calm',
                    icon: <Zap className="text-accent-magenta" size={18} />,
                    color: 'border-accent-magenta/30 bg-accent-magenta/5'
                });
            } else if (stress < 0.3 && hasStress) {
                return next.filter(a => a.id !== 'stress-protocol');
            }

            return next;
        });
    }, [stress]);

    const removeAction = (id: string) => {
        setActiveActions(prev => prev.filter(a => a.id !== id));
    };

    return (
        <div className="min-h-[100px] relative"> {/* Fixed min-height to reduce layout shift */}
            <AnimatePresence mode="popLayout">
                {activeActions.map((action) => (
                    <motion.div
                        key={action.id}
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -10, filter: 'blur(10px)' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        layout
                        className="mb-4 last:mb-0"
                    >
                        <GlassCard className={`${action.color} !p-4 group relative overflow-hidden`}>
                            {/* Scanning Sweep Effect */}
                            <div className="absolute inset-0 scan-sweep opacity-5" />
                            
                            <div className="flex gap-4 items-start relative z-10">
                                <div className="p-2 rounded-lg bg-black/40 border border-white/10 group-hover:scale-110 transition-transform">
                                    {action.icon}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-black text-white uppercase tracking-widest">{action.title}</h4>
                                        <span className="text-[8px] font-mono text-gray-500 uppercase">Proactive_Intent</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium leading-tight">{action.description}</p>
                                    <div className="flex gap-2 pt-2">
                                        <button 
                                            onClick={() => removeAction(action.id)}
                                            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-[9px] font-mono text-white uppercase transition-all"
                                        >
                                            {action.actionLabel}
                                        </button>
                                        <button 
                                            onClick={() => removeAction(action.id)}
                                            className="px-3 py-1 rounded border border-white/5 text-[9px] font-mono text-gray-500 uppercase hover:text-white transition-all"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </AnimatePresence>

            {activeActions.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-8 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl group"
                >
                    <div className="relative mb-3">
                        <Sparkles className="text-white/5 group-hover:text-accent-cyan/20 transition-colors" size={24} />
                    </div>
                    <p className="text-[9px] font-mono text-white/10 uppercase tracking-[0.3em]">Neural Baseline Stable</p>
                </motion.div>
            )}
        </div>
    );
}

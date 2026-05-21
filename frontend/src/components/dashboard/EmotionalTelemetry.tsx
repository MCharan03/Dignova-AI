'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSentientObserver } from '@/hooks/useSentientObserver';
import { GlassCard } from '@/components/ui/GlassCard';
import { Activity, Zap, Brain } from 'lucide-react';

export default function EmotionalTelemetry() {
    const { stress, jitter, cadence } = useSentientObserver();

    const [isRecalibrating, setIsRecalibrating] = React.useState(false);

    const orbColor = useMemo(() => {
        if (isRecalibrating) return 'rgba(139, 92, 246, 0.9)'; // Purple during sync
        if (stress > 0.7) return 'rgba(239, 68, 68, 0.8)'; // Red
        if (stress > 0.4) return 'rgba(245, 158, 11, 0.8)'; // Orange/Amber
        return 'rgba(6, 182, 212, 0.8)'; // Cyan/Blue
    }, [stress, isRecalibrating]);

    const handleRecalibrate = () => {
        setIsRecalibrating(true);
        // Simulate a "Neural Handshake"
        setTimeout(() => {
            setIsRecalibrating(false);
            // In a real app, we would reset baselines in the hook
        }, 2000);
    };

    const pulseDuration = useMemo(() => {
        if (isRecalibrating) return 0.2;
        return Math.max(0.5, 3 - (stress * 2.5));
    }, [stress, isRecalibrating]);

    return (
        <GlassCard className="relative overflow-hidden group">
            {/* Handshake Scanner Effect */}
            <AnimatePresence>
                {isRecalibrating && (
                    <motion.div 
                        initial={{ top: '-100%' }}
                        animate={{ top: '100%' }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, repeat: 1 }}
                        className="absolute inset-x-0 h-1 bg-accent-purple/50 blur-sm z-50 pointer-events-none"
                    />
                )}
            </AnimatePresence>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20">
                        <Brain className="text-accent-cyan" size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Neural Sync</h3>
                        <p className="text-[9px] font-mono text-accent-cyan/60 uppercase">Emotional Telemetry Active</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="px-2 py-0.5 rounded bg-black/40 border border-white/5 text-[8px] font-mono text-gray-400">SYNC_STABLE</div>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center py-8 relative">
                {/* Pulsing Orb */}
                <motion.div 
                    onClick={handleRecalibrate}
                    className="w-24 h-24 rounded-full relative z-10 cursor-pointer group/orb"
                    style={{ 
                        background: `radial-gradient(circle, ${orbColor} 0%, transparent 70%)`,
                        boxShadow: `0 0 40px ${orbColor}`
                    }}
                    animate={{ 
                        scale: [1, 1.1 + (stress * 0.2), 1],
                        opacity: [0.6, 1, 0.6]
                    }}
                    transition={{ 
                        duration: pulseDuration, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                    }}
                >
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap size={24} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                    </div>
                </motion.div>

                {/* Background Ring */}
                <motion.div 
                    className="absolute w-40 h-40 border border-white/5 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
                
                <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                    <div className="bg-black/60 rounded-xl p-3 border border-white/5 space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-mono text-gray-500 uppercase">Jitter</span>
                            <span className="text-[10px] font-mono text-accent-cyan">{(jitter * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-accent-cyan"
                                initial={{ width: 0 }}
                                animate={{ width: `${jitter * 100}%` }}
                            />
                        </div>
                    </div>
                    <div className="bg-black/60 rounded-xl p-3 border border-white/5 space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-mono text-gray-500 uppercase">Cadence</span>
                            <span className="text-[10px] font-mono text-accent-blue">{(cadence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-accent-blue"
                                initial={{ width: 0 }}
                                animate={{ width: `${cadence * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[9px] font-mono text-gray-500 leading-relaxed uppercase tracking-tighter">
                    {stress > 0.6 
                        ? "Warning: Elevated interaction jitter detected. Suggesting deep breathing protocol."
                        : "Interaction nominal. Neural alignment within expected parameters."}
                </p>
            </div>
        </GlassCard>
    );
}

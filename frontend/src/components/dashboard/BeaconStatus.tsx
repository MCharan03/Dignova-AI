'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Radio, ShieldCheck, Zap } from 'lucide-react';

export default function BeaconStatus() {
    return (
        <GlassCard className="relative overflow-hidden">
            {/* Background Radar Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 opacity-20 pointer-events-none">
                <motion.div 
                    className="absolute inset-0 border-2 border-accent-cyan rounded-full"
                    animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div 
                    className="absolute inset-0 border-2 border-accent-cyan rounded-full"
                    animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                    transition={{ duration: 3, delay: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
            </div>

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Radio className="text-emerald-500" size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Sentient Beacon</h3>
                        <p className="text-[9px] font-mono text-emerald-500/60 uppercase">Protocol: BLE_EMERGENCY</p>
                    </div>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-mono text-emerald-500 font-bold tracking-tighter">ARMED</span>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-white/5 group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-white/5">
                            <ShieldCheck size={14} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-white uppercase tracking-tight">Status: Idle</p>
                            <p className="text-[8px] font-mono text-gray-500">Scanning for critical cardiac events...</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-mono text-gray-500 uppercase">Range</span>
                        <span className="text-[10px] font-mono text-emerald-500 font-bold">15m</span>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-white/5 group hover:border-accent-blue/30 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-white/5">
                            <Zap size={14} className="text-gray-400 group-hover:text-accent-blue transition-colors" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-white uppercase tracking-tight">Beacon ID: DN-99-AF</p>
                            <p className="text-[8px] font-mono text-gray-500">Last heartbeat sync: 0.4s ago</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-mono text-gray-500 uppercase">Power</span>
                        <span className="text-[10px] font-mono text-accent-blue font-bold">ULTRA_LOW</span>
                    </div>
                </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[9px] text-emerald-500/70 leading-relaxed font-medium italic">
                    "If a critical drop in vitals is detected, Dignova will automatically broadcast an emergency SOS to nearby trained responders."
                </p>
            </div>
        </GlassCard>
    );
}

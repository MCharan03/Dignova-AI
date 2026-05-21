'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Terminal, Shield, Activity, Database } from 'lucide-react';

const EVENTS = [
    "Analyzing SpO2 trends from last 72 hours...",
    "Neural Medical Timeline synchronized with Architect Node",
    "Validating n8n follow-up workflow (Day-3 sequence)",
    "Emotional Telemetry baseline recalibrated",
    "Checking geofence perimeter alignment (500m radius)",
    "Ghost Replay buffer cleared for high-priority training",
    "Cross-referencing biometric anomalies with global database",
    "Sentient Beacon protocol: Armed and Scanning",
    "Zero-Touch Rx integrity check: PASSED",
    "Encrypting local session cache (AES-256)",
    "AI diagnostic consensus: Level 2 verification active",
    "Predictive health nudge scheduled: Hydration metrics low"
];

export default function AgencyLog() {
    const [logs, setLogs] = useState<string[]>([]);
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial random logs
        const initial = [...EVENTS].sort(() => 0.5 - Math.random()).slice(0, 4);
        setLogs(initial);

        const interval = setInterval(() => {
            const nextEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];
            setLogs(prev => {
                const updated = [...prev, nextEvent];
                if (updated.length > 6) return updated.slice(-6);
                return updated;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <GlassCard className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
                        <Terminal className="text-accent-blue" size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Agency Activity</h3>
                        <p className="text-[9px] font-mono text-accent-blue/60 uppercase">Background AI Processes</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-tighter">OS_CORE_ACTIVE</span>
                </div>
            </div>

            <div className="flex-1 bg-black/60 rounded-xl border border-white/5 p-4 font-mono overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/60 to-transparent z-10" />
                <div className="space-y-3" ref={logContainerRef}>
                    <AnimatePresence mode="popLayout">
                        {logs.map((log, i) => (
                            <motion.div 
                                key={log + i}
                                initial={{ opacity: 0, x: -10, filter: 'blur(5px)' }}
                                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                className="flex gap-3 items-start group"
                            >
                                <span className="text-[8px] text-accent-blue/40 mt-1">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                <p className="text-[10px] text-gray-400 leading-tight group-hover:text-white transition-colors">{log}</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/60 to-transparent z-10" />
            </div>

            <div className="mt-4 flex gap-4">
                <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                    <Database size={12} className="text-gray-500" />
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-accent-blue" 
                            animate={{ width: ["20%", "45%", "30%"] }} 
                            transition={{ duration: 4, repeat: Infinity }}
                        />
                    </div>
                    <span className="text-[8px] font-mono text-gray-500">I/O</span>
                </div>
                <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                    <Activity size={12} className="text-gray-500" />
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-accent-cyan" 
                            animate={{ width: ["60%", "85%", "70%"] }} 
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </div>
                    <span className="text-[8px] font-mono text-gray-500">CPU</span>
                </div>
            </div>
        </GlassCard>
    );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Terminal, Shield, Activity, Database } from 'lucide-react';

export default function AgencyLog() {
    const [logs, setLogs] = useState<any[]>([]);
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const eventSource = new EventSource(`${apiUrl}/api/agency/stream`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLogs(prev => {
                    const updated = [...prev, data];
                    if (updated.length > 8) return updated.slice(-8);
                    return updated;
                });
            } catch (err) {
                console.error("SSE Parse Error:", err);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE Connection Error:", err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
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
                        <p className="text-[9px] font-mono text-accent-blue/60 uppercase">Real-Time Sentient Pulse</p>
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
                        {logs.map((log) => (
                            <motion.div 
                                key={log.id}
                                initial={{ opacity: 0, x: -10, filter: 'blur(5px)' }}
                                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                className="flex gap-3 items-start group"
                            >
                                <span className="text-[8px] text-accent-blue/40 mt-1">
                                    [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                                </span>
                                <div className="flex flex-col gap-0.5">
                                    <span className={`text-[7px] uppercase font-black tracking-widest ${
                                        log.type === 'system_healing' ? 'text-emerald-400' :
                                        log.type === 'telemetry' ? 'text-accent-cyan' :
                                        log.type === 'security_audit' ? 'text-rose-400' :
                                        'text-accent-blue'
                                    }`}>
                                        {log.type.replace('_', ' ')}
                                    </span>
                                    <p className="text-[10px] text-gray-400 leading-tight group-hover:text-white transition-colors">
                                        {log.message}
                                    </p>
                                </div>
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

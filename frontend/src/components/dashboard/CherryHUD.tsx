'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ShieldAlert, Cpu, RefreshCw, Activity } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { apiUrl } from '@/lib/api';

interface WorkspaceContext {
    active_patient: string;
    current_document: string;
    context_summary: string;
    detected_anomalies: string[];
}

export function CherryHUD() {
    const [isOpen, setIsOpen] = useState(false);
    const [context, setContext] = useState<WorkspaceContext>({
        active_patient: 'None',
        current_document: 'None',
        context_summary: 'Workspace scan pending.',
        detected_anomalies: []
    });
    const [scanning, setScanning] = useState(false);

    const fetchContext = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch(apiUrl('/api/awareness/context'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                setContext(data);
            }
        } catch (err) {
            console.error('Failed to fetch workspace context:', err);
        }
    };

    const triggerScan = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        setScanning(true);
        try {
            await fetch(apiUrl('/api/awareness/trigger'), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            // Poll for update after 4 seconds
            setTimeout(async () => {
                await fetchContext();
                setScanning(false);
            }, 4000);
        } catch (err) {
            console.error('Failed to trigger scan:', err);
            setScanning(false);
        }
    };

    useEffect(() => {
        fetchContext();
        const interval = setInterval(fetchContext, 15000); // poll every 15s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative">
            {/* HUD Trigger Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
                    context.detected_anomalies.length > 0
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse'
                        : 'bg-white/5 border-white/10 text-accent-cyan/80 hover:text-accent-cyan'
                }`}
            >
                <Cpu size={14} className={scanning ? 'animate-spin' : ''} />
                <span>CHERRY HUD</span>
            </motion.button>

            {/* Expanded HUD Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute right-0 mt-3 w-80 z-[1000] origin-top-right"
                    >
                        <GlassCard className="p-4 border-accent-cyan/30 shadow-2xl shadow-accent-cyan/10">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                                <div className="flex items-center gap-2 text-accent-cyan">
                                    <Eye size={16} />
                                    <span className="text-xs font-bold font-mono tracking-wider">PASSIVE AWARENESS</span>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 180 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={triggerScan}
                                    disabled={scanning}
                                    className="p-1 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                                >
                                    <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
                                </motion.button>
                            </div>

                            <div className="flex flex-col gap-3 font-mono text-[11px]">
                                <div>
                                    <span className="text-white/40 block mb-0.5">ACTIVE PATIENT:</span>
                                    <span className="text-white font-bold">{context.active_patient}</span>
                                </div>

                                <div>
                                    <span className="text-white/40 block mb-0.5">ACTIVE DOCUMENT:</span>
                                    <span className="text-white font-medium truncate block max-w-full">
                                        {context.current_document}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-white/40 block mb-0.5">CHERRY FOCUS:</span>
                                    <span className="text-accent-cyan/90 leading-relaxed block">
                                        {context.context_summary}
                                    </span>
                                </div>

                                {context.detected_anomalies.length > 0 && (
                                    <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                        <div className="flex items-center gap-1.5 font-bold mb-1">
                                            <ShieldAlert size={12} />
                                            <span>ACTIVE ALERTS</span>
                                        </div>
                                        <ul className="list-disc pl-3 flex flex-col gap-0.5">
                                            {context.detected_anomalies.map((anomaly, idx) => (
                                                <li key={idx}>{anomaly}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

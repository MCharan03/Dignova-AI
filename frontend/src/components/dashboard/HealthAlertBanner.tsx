'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Alert { field: string; value: number; severity: string; msg: string; }
interface VitalAlertStatus { status: 'NORMAL' | 'HIGH' | 'CRITICAL' | 'no_data'; alerts: Alert[]; recorded_at: string | null; }

export function HealthAlertBanner() {
    const [data, setData] = useState<VitalAlertStatus | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        fetch('/api/alerts/my-vitals-status', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(setData)
            .catch(() => {});
    }, []);

    if (!data || data.status === 'NORMAL' || data.status === 'no_data' || dismissed) return null;

    const isCritical = data.status === 'CRITICAL';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                className={`relative mb-6 rounded-2xl border p-4 overflow-hidden ${isCritical ? 'bg-rose-500/10 border-rose-500/40' : 'bg-amber-500/10 border-amber-500/40'}`}
            >
                {/* Pulsing background */}
                <span className={`absolute inset-0 rounded-2xl ${isCritical ? 'bg-rose-500/5 animate-pulse' : 'bg-amber-500/5'}`} />

                <div className="relative flex items-start gap-4">
                    <div className={`p-2 rounded-xl shrink-0 ${isCritical ? 'bg-rose-500/20' : 'bg-amber-500/20'}`}>
                        <AlertTriangle size={20} className={isCritical ? 'text-rose-400 animate-pulse' : 'text-amber-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`font-black text-sm uppercase tracking-widest ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                            {isCritical ? '⚠️ Critical Vitals Detected' : '⚠️ Abnormal Vitals'}
                        </p>
                        <div className="mt-2 space-y-1">
                            {data.alerts.slice(0, 3).map((a, i) => (
                                <p key={i} className="text-xs text-white/60">{a.msg}</p>
                            ))}
                            {data.alerts.length > 3 && (
                                <p className="text-[10px] font-mono text-white/30">+{data.alerts.length - 3} more alerts</p>
                            )}
                        </div>
                        <button
                            onClick={() => router.push('/user/vitals')}
                            className={`mt-3 flex items-center gap-1 text-xs font-bold uppercase tracking-widest ${isCritical ? 'text-rose-400' : 'text-amber-400'} hover:underline`}
                        >
                            View Vitals <ChevronRight size={12} />
                        </button>
                    </div>
                    <button onClick={() => setDismissed(true)} className="text-white/30 hover:text-white transition-colors shrink-0">
                        <X size={16} />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

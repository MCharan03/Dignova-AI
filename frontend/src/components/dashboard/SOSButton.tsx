'use client';
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Phone, X, CheckCircle, Loader } from 'lucide-react';

interface SOSButtonProps {
    userName?: string;
}

type SOSState = 'idle' | 'confirm' | 'countdown' | 'sending' | 'sent' | 'error';

export function SOSButton({ userName }: SOSButtonProps) {
    const [state, setState] = useState<SOSState>('idle');
    const [countdown, setCountdown] = useState(3);
    const [result, setResult] = useState<any>(null);

    const startCountdown = useCallback(() => {
        setState('countdown');
        let count = 3;
        setCountdown(count);
        const interval = setInterval(() => {
            count -= 1;
            setCountdown(count);
            if (count <= 0) {
                clearInterval(interval);
                sendSOS();
            }
        }, 1000);
        // Store interval so we can cancel
        (window as any).__sosInterval = interval;
    }, []);

    const cancelSOS = () => {
        clearInterval((window as any).__sosInterval);
        setState('idle');
        setCountdown(3);
    };

    const sendSOS = async () => {
        setState('sending');
        const token = localStorage.getItem('access_token');
        try {
            // Get current location if available
            let lat: number | undefined, lon: number | undefined;
            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
                );
                lat = pos.coords.latitude;
                lon = pos.coords.longitude;
            } catch {}

            const res = await fetch('/api/sos/trigger', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Patient requires immediate assistance', lat, lon })
            });
            if (res.ok) {
                setResult(await res.json());
                setState('sent');
            } else {
                setState('error');
            }
        } catch {
            setState('error');
        }
    };

    return (
        <div className="relative">
            {/* Main SOS Button */}
            {state === 'idle' && (
                <motion.button
                    onClick={() => setState('confirm')}
                    className="relative flex items-center gap-3 px-6 py-3 rounded-2xl bg-rose-600/20 border border-rose-500/40 text-rose-400 hover:bg-rose-600/30 hover:border-rose-500/60 transition-all group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                >
                    <span className="absolute inset-0 rounded-2xl bg-rose-500/10 animate-ping opacity-50" />
                    <AlertTriangle size={18} className="animate-pulse" />
                    <span className="text-sm font-black uppercase tracking-widest">SOS</span>
                </motion.button>
            )}

            {/* Confirmation Modal */}
            <AnimatePresence>
                {(state === 'confirm' || state === 'countdown') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
                        onClick={e => e.target === e.currentTarget && cancelSOS()}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 40 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 40 }}
                            className="bg-[#0B0F19] border border-rose-500/40 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl shadow-rose-500/20"
                        >
                            <div className="relative mx-auto w-24 h-24 mb-6">
                                <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                                <span className="absolute inset-2 rounded-full bg-rose-500/20 animate-ping animation-delay-200" />
                                <div className="relative w-full h-full rounded-full bg-rose-600/30 border-2 border-rose-500 flex items-center justify-center">
                                    {state === 'countdown' ? (
                                        <span className="text-4xl font-black text-rose-400">{countdown}</span>
                                    ) : (
                                        <Phone size={36} className="text-rose-400" />
                                    )}
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">
                                {state === 'countdown' ? 'Sending SOS...' : 'Emergency SOS'}
                            </h2>
                            <p className="text-sm text-white/50 mb-8">
                                {state === 'countdown'
                                    ? 'Alert dispatching to all available doctors. Tap cancel to abort.'
                                    : 'This will alert all online doctors and the hospital admin immediately. Your location will be shared.'}
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={cancelSOS}
                                    className="flex-1 py-3 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all font-bold uppercase tracking-widest text-sm"
                                >
                                    <X size={16} className="inline mr-2" />Cancel
                                </button>
                                {state === 'confirm' && (
                                    <button
                                        onClick={startCountdown}
                                        className="flex-1 py-3 rounded-2xl bg-rose-600 border border-rose-500 text-white font-black uppercase tracking-widest text-sm hover:bg-rose-500 transition-all"
                                    >
                                        <AlertTriangle size={16} className="inline mr-2" />Send SOS
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {state === 'sending' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="text-center">
                            <Loader size={48} className="text-rose-400 animate-spin mx-auto mb-4" />
                            <p className="text-white font-black uppercase tracking-widest">Dispatching Emergency Alert...</p>
                        </div>
                    </motion.div>
                )}

                {state === 'sent' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
                        onClick={() => setState('idle')}>
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-[#0B0F19] border border-emerald-500/40 rounded-3xl p-10 max-w-md w-full text-center">
                            <CheckCircle size={64} className="text-emerald-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Help Is Coming</h2>
                            <p className="text-sm text-white/50 mb-6">Your emergency alert has been dispatched.</p>
                            {result?.alerted_doctors?.length > 0 && (
                                <div className="space-y-2 mb-6">
                                    <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-3">Doctors Notified</p>
                                    {result.alerted_doctors.map((d: any) => (
                                        <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs">{d.name?.[0]}</div>
                                            <div className="text-left"><p className="text-sm font-bold text-white">{d.name}</p><p className="text-[9px] text-emerald-400 font-mono">{d.specialty}</p></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button onClick={() => setState('idle')} className="w-full py-3 rounded-2xl border border-white/10 text-white/60 hover:text-white transition-all text-sm font-bold uppercase">Dismiss</button>
                        </motion.div>
                    </motion.div>
                )}

                {state === 'error' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-6" onClick={() => setState('idle')}>
                        <div className="bg-[#0B0F19] border border-rose-500/40 rounded-3xl p-10 max-w-sm w-full text-center">
                            <AlertTriangle size={48} className="text-rose-400 mx-auto mb-4" />
                            <p className="text-white font-black uppercase mb-2">Alert Failed</p>
                            <p className="text-sm text-white/40">Could not reach servers. Call emergency services directly.</p>
                            <button onClick={() => setState('idle')} className="mt-6 w-full py-2 rounded-xl border border-white/10 text-white/60 text-sm">Dismiss</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

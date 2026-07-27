'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { MessageSquare, Phone, ShieldCheck, Zap, Brain, Activity, PhoneCall, Loader2, Check } from 'lucide-react';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';

import { useRouter } from 'next/navigation';

type CallState = 'idle' | 'calling' | 'success' | 'error';

export default function TriageSelectionPage() {
    const router = useRouter();
    const [phone, setPhone] = useState('+919036205526');
    const [callState, setCallState] = useState<CallState>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    React.useEffect(() => {
        const fetchUserPhone = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) return;
            try {
                const res = await fetch('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.phone_number) {
                        setPhone(data.phone_number);
                    }
                }
            } catch {}
        };
        fetchUserPhone();
    }, []);

    const handlePhoneCall = async () => {
        const cleaned = phone.trim();
        if (!cleaned) return;

        // Minimal E.164 validation — reuse native API, no library needed
        const e164Regex = /^\+[1-9]\d{7,14}$/;
        if (!e164Regex.test(cleaned)) {
            setErrorMsg('Use E.164 format: +91XXXXXXXXXX');
            return;
        }

        setErrorMsg('');
        setCallState('calling');

        try {
            const token = localStorage.getItem('access_token');
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dignova-ai.onrender.com';
            const res = await fetch(`${baseUrl}/api/twilio/outbound`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ phone_number: cleaned, patient_name: 'Patient' }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Call failed');
            }

            setCallState('success');
        } catch (err: any) {
            setErrorMsg(err.message || 'Could not place call');
            setCallState('error');
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh] space-y-12">
            <div className="text-center space-y-4">
                <SplitText text="SELECT UPLINK MODE" className="text-4xl font-black text-white tracking-tighter" />
                <BlurIn delay={0.2}>
                    <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.3em]">
                        Choose your interaction protocol with the Sentient Core
                    </p>
                </BlurIn>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">

                {/* Card 1 — Neural Chat */}
                <motion.div
                    whileHover={{ scale: 1.02, translateY: -5 }}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <GlassCard
                        className="p-10 h-full flex flex-col items-center text-center space-y-6 cursor-pointer border-accent-cyan/20 hover:border-accent-cyan/60 transition-all group"
                        onClick={() => router.push('/user/chat-triage')}
                    >
                        <div className="p-6 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 group-hover:bg-accent-cyan/20 transition-all">
                            <MessageSquare size={48} className="text-accent-cyan" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Neural Chat Link</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Discrete, text-based triage. Ideal for rapid symptom documentation and AR-powered visual uploads.
                            </p>
                        </div>
                        <ul className="text-[10px] font-mono text-accent-cyan/60 space-y-2 uppercase text-left w-full pt-4 border-t border-white/5">
                            <li className="flex items-center gap-2"><Zap size={12} /> Encrypted Text Pipeline</li>
                            <li className="flex items-center gap-2"><Zap size={12} /> AR Biometric Scanning</li>
                            <li className="flex items-center gap-2"><Zap size={12} /> Low Latency Response</li>
                        </ul>
                    </GlassCard>
                </motion.div>

                {/* Card 2 — Sentient Voice Agent */}
                <motion.div
                    whileHover={{ scale: 1.02, translateY: -5 }}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <GlassCard
                        className="p-10 h-full flex flex-col items-center text-center space-y-6 cursor-pointer border-accent-magenta/20 hover:border-accent-magenta/60 transition-all group"
                        onClick={() => router.push('/user/voice-triage')}
                    >
                        <div className="p-6 rounded-full bg-accent-magenta/10 border border-accent-magenta/20 group-hover:bg-accent-magenta/20 transition-all">
                            <Brain size={48} className="text-accent-magenta" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Sentient Voice Agent</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                High-fidelity audio interaction. Speak naturally with the AI Doctor for an intuitive clinical assessment.
                            </p>
                        </div>
                        <ul className="text-[10px] font-mono text-accent-magenta/60 space-y-2 uppercase text-left w-full pt-4 border-t border-white/5">
                            <li className="flex items-center gap-2"><Activity size={12} /> Real-time Audio Stream</li>
                            <li className="flex items-center gap-2"><Activity size={12} /> Natural Language Brain</li>
                            <li className="flex items-center gap-2"><Activity size={12} /> Professional AI Persona</li>
                        </ul>
                    </GlassCard>
                </motion.div>

                {/* Card 3 — Diagnova Phone Call (NEW) */}
                <motion.div
                    whileHover={{ scale: 1.02, translateY: -5 }}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <GlassCard className="p-10 h-full flex flex-col items-center text-center space-y-6 border-amber-500/20 hover:border-amber-500/60 transition-all group">
                        {/* Glow ring */}
                        <div className="relative p-6 rounded-full bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-all">
                            <PhoneCall size={48} className="text-amber-400" />
                            <AnimatePresence>
                                {callState === 'calling' && (
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-2 border-amber-400"
                                        initial={{ scale: 1, opacity: 1 }}
                                        animate={{ scale: 1.6, opacity: 0 }}
                                        transition={{ duration: 1.2, repeat: Infinity }}
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Diagnova Phone Call</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                We call you. Answer and speak directly with the AI Doctor on your phone — no app required.
                            </p>
                        </div>

                        {/* Phone input + call button */}
                        <div className="w-full space-y-3 pt-4 border-t border-white/5">
                            <AnimatePresence mode="wait">
                                {callState === 'success' ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center gap-2 text-emerald-400"
                                    >
                                        <Check size={32} className="text-emerald-400" />
                                        <p className="text-sm font-mono uppercase tracking-wider">Call Incoming…</p>
                                        <p className="text-xs text-gray-500">Diagnova AI is dialing your number</p>
                                    </motion.div>
                                ) : (
                                    <motion.div key="form" className="w-full space-y-3">
                                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus-within:border-amber-500/60 transition-colors">
                                            <Phone size={14} className="text-amber-400 shrink-0" />
                                            <input
                                                id="phone-input"
                                                type="tel"
                                                placeholder="+91 98765 43210"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handlePhoneCall()}
                                                className="bg-transparent text-white text-sm font-mono placeholder-gray-600 outline-none w-full"
                                            />
                                        </div>

                                        {errorMsg && (
                                            <p className="text-xs text-red-400 font-mono">{errorMsg}</p>
                                        )}

                                        <button
                                            id="call-me-btn"
                                            onClick={handlePhoneCall}
                                            disabled={callState === 'calling' || !phone.trim()}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-bold uppercase tracking-widest hover:bg-amber-500/30 hover:border-amber-500/70 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                        >
                                            {callState === 'calling' ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Dialing…
                                                </>
                                            ) : (
                                                <>
                                                    <PhoneCall size={14} />
                                                    Call Me Now
                                                </>
                                            )}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <ul className="text-[10px] font-mono text-amber-500/50 space-y-2 uppercase text-left w-full">
                            <li className="flex items-center gap-2"><Zap size={12} /> Twilio-Powered Secure Line</li>
                            <li className="flex items-center gap-2"><Zap size={12} /> Gemini Live AI Doctor</li>
                            <li className="flex items-center gap-2"><Zap size={12} /> Auto Emergency Escalation</li>
                        </ul>
                    </GlassCard>
                </motion.div>
            </div>

            <BlurIn delay={0.7}>
                <div className="flex items-center gap-4 text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                    <ShieldCheck size={14} className="text-success" />
                    Secure_Node_Connection_v4.2 // Protocol_Standard_ISO_27001
                </div>
            </BlurIn>
        </div>
    );
}

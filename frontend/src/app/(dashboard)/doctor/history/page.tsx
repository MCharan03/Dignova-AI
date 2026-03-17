'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Clock, ShieldAlert, Cpu, Activity, CheckCircle2 } from 'lucide-react';

interface CallData {
    call_id: number;
    user_id: number;
    start_time: string;
    end_time: string | null;
    state: string;
    transcript: string | null;
    diagnosis_given: string | null;
    severity: string | null;
}

export default function DoctorHistoryPage() {
    const [calls, setCalls] = useState<CallData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCalls = async () => {
            const token = localStorage.getItem('access_token');
            try {
                const res = await fetch('/api/calls', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Filter for completed/evaluation calls to show history
                    const historyCalls = data.filter((c: CallData) => c.state !== 'active');
                    setCalls(historyCalls);
                }
            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCalls();
    }, []);

    const getSeverityColor = (severity: string | null) => {
        if (!severity) return 'text-gray-400';
        switch (severity.toUpperCase()) {
            case 'CRITICAL': return 'text-danger bg-danger/10 border-danger/30';
            case 'ELEVATED': return 'text-warning bg-warning/10 border-warning/30';
            default: return 'text-success bg-success/10 border-success/30';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-accent-cyan animate-pulse font-mono tracking-widest text-sm">ACCESSING ARCHIVE...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Activity className="text-accent-cyan" />
                        Patient Encounter Archive
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 border-l-2 border-accent-cyan/50 pl-3">
                        Historical telemetry and AI triage summaries for assigned cases.
                    </p>
                </div>
                <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
                    <span className="text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider">Sync Active</span>
                </div>
            </div>

            <div className="grid gap-6">
                {calls.length === 0 ? (
                    <GlassCard className="p-12 text-center text-gray-400">
                        <CheckCircle2 className="mx-auto mb-4 text-white/20" size={48} />
                        <p className="text-lg font-medium">No Historical Data Found.</p>
                        <p className="text-sm">Completed triage evaluations will populate here.</p>
                    </GlassCard>
                ) : (
                    calls.map((call, index) => (
                        <motion.div
                            key={call.call_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <GlassCard className="overflow-hidden group hover:border-accent-cyan/30 transition-all duration-300">
                                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 bg-white/[0.02]">
                                    <div className="flex items-center gap-4">
                                        <div className={`px-3 py-1 rounded-md border text-xs font-black uppercase tracking-wider flex items-center gap-2 ${getSeverityColor(call.severity)}`}>
                                            <ShieldAlert size={14} />
                                            {call.severity || 'UNKNOWN'}
                                        </div>
                                        <span className="font-mono text-gray-400 text-sm">
                                            ID: <span className="text-gray-200">#{call.call_id.toString().padStart(4, '0')}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
                                        <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                                            <Clock size={14} className="text-accent-blue" />
                                            <span>
                                                {new Date(call.start_time).toLocaleDateString()} {new Date(call.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {call.end_time && (
                                            <>
                                                <span className="text-white/20">→</span>
                                                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                                                    <span>{new Date(call.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="p-6 grid md:grid-cols-[1fr_250px] gap-8">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Cpu size={16} /> AI Transcription & Synthesis
                                        </h3>
                                        <div className="bg-black/30 p-4 rounded-xl border border-white/5 font-mono text-sm text-gray-300 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                                            {call.transcript ? (
                                                call.transcript.split('\n').map((line, i) => (
                                                    <div key={i} className="mb-2">
                                                        {line.startsWith('PATIENT:') ? (
                                                            <span className="text-accent-blue opacity-80">{line}</span>
                                                        ) : line.startsWith('ASSISTANT:') ? (
                                                            <span className="text-accent-cyan">{line}</span>
                                                        ) : (
                                                            line
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-gray-600">No telemetry recorded.</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 text-center">Final Triaged Diagnosis</h3>
                                        <div className="bg-white/5 rounded-xl border border-white/10 p-4 text-center h-full flex items-center justify-center">
                                            <span className="text-white font-medium">
                                                {call.diagnosis_given || 'Inconclusive / Manual Override'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))
                )}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(6, 182, 212, 0.5);
                }
            `}</style>
        </div>
    );
}


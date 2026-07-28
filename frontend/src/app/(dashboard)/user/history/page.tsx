'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { History, Activity, Clock, CheckCircle2, AlertCircle, PhoneIncoming, ChevronRight, X, FileText, Download, User, Shield, Heart as HeartPulse } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface Call {
    call_id: number;
    user_id: number;
    start_time: string;
    end_time: string | null;
    state: string;
    diagnosis_given: string | null;
    transcript: string | null;
    severity: string | null;
    is_recovered?: boolean | null;
}

interface Prescription {
    id: number;
    call_id: number;
    diagnosis: string;
    pdf_url: string;
    created_at: string;
}

export default function UserHistoryPage() {
    const [calls, setCalls] = useState<Call[]>([]);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const [callsRes, rxRes] = await Promise.all([
                    fetch(apiUrl('/api/calls'), { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(apiUrl('/api/hospital/prescriptions/me'), { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (callsRes.ok) setCalls(await callsRes.json().catch(() => ({})));
                if (rxRes.ok) setPrescriptions(await rxRes.json().catch(() => ({})));
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const getStatusIcon = (state: string) => {
        switch (state) {
            case 'active': return <Activity className="text-accent-magenta animate-pulse" size={18} />;
            case 'evaluation': return <Clock className="text-accent-cyan" size={18} />;
            default: return <CheckCircle2 className="text-success" size={18} />;
        }
    };

    const formatTranscript = (text: string | null) => {
        if (!text) return <p className="text-gray-500 italic">No telemetry data captured for this sequence.</p>;
        return text.split('\n').map((line, i) => {
            if (line.startsWith('PATIENT:')) return <p key={i} className="mb-2"><span className="text-accent-pink font-bold">PATIENT:</span> {line.replace('PATIENT:', '')}</p>;
            if (line.startsWith('ASSISTANT:')) return <p key={i} className="mb-2"><span className="text-accent-cyan font-bold">DIGNOVA:</span> {line.replace('ASSISTANT:', '')}</p>;
            if (line.startsWith('DOCTOR:')) return <p key={i} className="mb-2"><span className="text-success font-bold">DOCTOR:</span> {line.replace('DOCTOR:', '')}</p>;
            return <p key={i} className="mb-1 text-gray-500 text-xs font-mono">{line}</p>;
        });
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <p className="text-accent-cyan animate-pulse font-mono tracking-widest uppercase">Synchronizing Logs...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 relative">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">My Call History</h1>
                    <p className="text-gray-400">Review your past emergency triage sessions and medical summaries.</p>
                </div>
                <div className="p-3 rounded-full bg-accent-cyan/10 border border-accent-cyan/20">
                    <History size={32} className="text-accent-cyan" />
                </div>
            </div>

            {error && (
                <GlassCard className="p-4 border-danger/30 bg-danger/10 text-danger flex items-center gap-3">
                    <AlertCircle size={20} />
                    <span>Error loading history: {error}</span>
                </GlassCard>
            )}

            {!loading && calls.length === 0 ? (
                <GlassCard className="p-12 text-center border-white/5 bg-white/[0.02]">
                    <PhoneIncoming className="mx-auto mb-4 text-gray-600" size={48} />
                    <h3 className="text-xl font-semibold mb-2">No calls logged yet</h3>
                    <p className="text-gray-400">Your emergency assistance calls will appear here once they are completed.</p>
                </GlassCard>
            ) : (
                <div className="grid gap-4">
                    {calls.map((call, idx) => (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={call.call_id}
                        >
                            <GlassCard 
                                onClick={() => setSelectedCall(call)}
                                className="p-5 hover:bg-white/5 transition-all cursor-pointer group border-white/10 hover:border-accent-cyan/30"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${call.state === 'active' ? 'bg-accent-magenta/10 border border-accent-magenta/20' : 'bg-white/5 border border-white/10'}`}>
                                            {getStatusIcon(call.state)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg font-bold text-white group-hover:text-accent-cyan transition-colors">
                                                    Session #{call.call_id}
                                                </span>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                    call.state === 'active' ? 'bg-accent-magenta/20 text-accent-magenta' : 
                                                    call.state === 'evaluation' ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-success/20 text-success'
                                                }`}>
                                                    {call.state}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 font-mono">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock size={14} />
                                                    {new Date(call.start_time).toLocaleString()}
                                                </span>
                                                {call.diagnosis_given && (
                                                    <span className="flex items-center gap-1.5 text-accent-cyan/80">
                                                        <Shield size={14} />
                                                        {call.diagnosis_given}
                                                    </span>
                                                )}
                                                {call.is_recovered !== undefined && call.is_recovered !== null && (
                                                    <span className={`flex items-center gap-1.5 ${call.is_recovered ? 'text-success' : 'text-danger'} font-bold`}>
                                                        <HeartPulse size={14} />
                                                        {call.is_recovered ? 'RECOVERED' : 'STILL SICK'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-gray-600 group-hover:text-accent-cyan group-hover:translate-x-1 transition-all" />
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* DOCUMENT VAULT (Level 09 Sync) */}
            <div className="pt-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-accent-blue/20">
                        <FileText className="text-accent-blue" size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-widest">Document Vault</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {prescriptions.map((rx) => (
                        <GlassCard key={rx.id} className="p-4 border-white/5 hover:border-accent-blue/40 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-xl bg-accent-blue/10 text-accent-blue group-hover:bg-accent-blue group-hover:text-black transition-all">
                                    <Shield size={20} />
                                </div>
                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter">Verified_Prescription</span>
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">{rx.diagnosis}</h4>
                            <p className="text-[10px] font-mono text-gray-500 mb-6 uppercase">{new Date(rx.created_at).toLocaleDateString()}</p>
                            
                            <button 
                                onClick={() => window.open(rx.pdf_url, '_blank')}
                                className="w-full py-2 rounded-lg bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/30 text-accent-blue text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <Download size={14} /> Download PDF
                            </button>
                        </GlassCard>
                    ))}
                    {prescriptions.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                            <FileText className="mx-auto mb-2 text-white/5" size={32} />
                            <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">No documents in vault</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Transcript Modal (Transcript Dump) */}
            <AnimatePresence>
                {selectedCall && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedCall(null)}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="relative w-full max-w-2xl bg-gray-900 border border-white/15 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.1)]">
                                        <FileText className="text-accent-cyan" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">Sequence Log #{selectedCall.call_id.toString().padStart(5, '0')}</h2>
                                        <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">{new Date(selectedCall.start_time).toLocaleString()}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedCall(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-white"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-8 max-h-[55vh] overflow-y-auto font-sans text-sm leading-relaxed text-gray-300 custom-scrollbar scroll-smooth">
                                <div className="space-y-4">
                                    {formatTranscript(selectedCall.transcript)}
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/10 bg-white/[0.01] flex items-center justify-between">
                                <div className="flex gap-6 text-[10px] uppercase font-bold tracking-widest text-gray-500">
                                    <span className="flex items-center gap-2"><User size={12} className="text-accent-cyan" /> UID_{selectedCall.user_id}</span>
                                    <span className="flex items-center gap-2">
                                        <Activity size={12} className={selectedCall.state === 'active' ? 'text-accent-magenta animate-pulse' : 'text-success'} /> 
                                        {selectedCall.state}
                                    </span>
                                </div>
                                <button className="flex items-center gap-2 px-5 py-2.5 bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30 rounded-xl text-xs font-bold text-accent-cyan transition-all group">
                                    <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                                    Export Sequence Data
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}


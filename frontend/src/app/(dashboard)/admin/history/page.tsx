'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Database, Search, Filter, Shield, Activity, User, X, FileText, Download } from 'lucide-react';

interface CallData {
    call_id: number;
    user_id: number;
    start_time: string;
    end_time: string | null;
    state: string;
    diagnosis_given: string | null;
    severity: string | null;
    transcript: string | null;
}

export default function AdminHistoryPage() {
    const [calls, setCalls] = useState<CallData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCall, setSelectedCall] = useState<CallData | null>(null);

    useEffect(() => {
        const fetchCalls = async () => {
            const token = localStorage.getItem('access_token');
            try {
                const res = await fetch('/api/calls', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCalls(data);
                }
            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCalls();
    }, []);

    const filteredCalls = calls.filter(call =>
        call.call_id.toString().includes(searchTerm) ||
        call.user_id?.toString().includes(searchTerm) ||
        call.state.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (state: string) => {
        switch (state) {
            case 'active': return 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30';
            case 'evaluation': return 'text-accent-blue bg-accent-blue/10 border-accent-blue/30';
            case 'completed': return 'text-success bg-success/10 border-success/30';
            default: return 'text-gray-400 bg-white/5 border-white/10';
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

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto relative">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Database className="text-accent-blue" />
                        System Telemetry Logs
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 border-l-2 border-accent-blue/50 pl-3">
                        Global oversight of all triage encounters and active sessions.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search ID, Node, State..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-accent-blue/50 min-w-[250px]"
                        />
                    </div>
                </div>
            </div>

            <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/[0.02]">
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Triage ID</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Node / User</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Timestamp</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Severity Flag</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest font-mono text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400 font-mono tracking-widest animate-pulse">
                                        QUERYING DATABASE...
                                    </td>
                                </tr>
                            ) : filteredCalls.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                                        No telemetry records match your parameters.
                                    </td>
                                </tr>
                            ) : (
                                filteredCalls.map((call, idx) => (
                                    <motion.tr
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={call.call_id}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                                    >
                                        <td className="p-4 font-mono text-sm text-gray-300">#{call.call_id.toString().padStart(5, '0')}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                                    <User size={12} className="text-gray-400" />
                                                </div>
                                                <span className="text-gray-200 text-sm">UID_{call.user_id}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-400 font-mono">
                                            {new Date(call.start_time).toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded border text-xs font-bold uppercase tracking-wider ${getStatusColor(call.state)}`}>
                                                {call.state}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-300 font-medium">
                                            {call.severity ? (
                                                <span className="flex items-center gap-1.5 px-2 py-1 bg-black/30 rounded border border-white/5 w-max">
                                                    <Shield size={14} className={call.severity === 'CRITICAL' ? 'text-danger' : 'text-warning'} />
                                                    {call.severity}
                                                </span>
                                            ) : (
                                                <span className="text-gray-600 italic">Awaiting Setup</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => setSelectedCall(call)}
                                                className="text-xs font-mono font-bold text-accent-cyan hover:text-white transition-colors opacity-0 group-hover:opacity-100 uppercase tracking-widest"
                                            >
                                                View Dump →
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            {/* Transcript Modal */}
            <AnimatePresence>
                {selectedCall && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedCall(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-accent-blue/20 flex items-center justify-center">
                                        <FileText className="text-accent-blue" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Sequence Log #{selectedCall.call_id.toString().padStart(5, '0')}</h2>
                                        <p className="text-xs text-gray-500 font-mono">Timestamp: {new Date(selectedCall.start_time).toLocaleString()}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedCall(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 max-h-[60vh] overflow-y-auto font-sans text-sm leading-relaxed text-gray-300 custom-scrollbar">
                                {formatTranscript(selectedCall.transcript)}
                            </div>

                            <div className="p-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between">
                                <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest text-gray-500">
                                    <span className="flex items-center gap-1"><User size={10} /> UID_{selectedCall.user_id}</span>
                                    <span className="flex items-center gap-1"><Activity size={10} /> {selectedCall.state}</span>
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-all">
                                    <Download size={14} />
                                    Export Core Dump
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}


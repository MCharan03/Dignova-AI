'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { FileBarChart, CheckCircle2, AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface CallData {
    call_id: number;
    start_time: string;
    end_time: string | null;
    state: string;
    diagnosis_given: string | null;
    severity: string | null;
    ai_feedback: string | null;
}

export default function InternReportsPage() {
    const [reports, setReports] = useState<CallData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            const token = localStorage.getItem('access_token');
            try {
                const res = await fetch(apiUrl('/api/calls'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json().catch(() => ({}));
                    // Filter for evaluated calls
                    const evalCalls = data.filter((c: CallData) => c.state === 'evaluation' || (c.state === 'completed' && c.ai_feedback));
                    setReports(evalCalls);
                }
            } catch (error) {
                console.error("Failed to fetch reports:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-accent-cyan animate-pulse font-mono tracking-widest text-sm">COMPILING TRAINEE METRICS...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <FileBarChart className="text-accent-pink" />
                        Performance Analytics
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 border-l-2 border-accent-pink/50 pl-3">
                        AI-generated feedback and evaluation models for simulated medical encounters.
                    </p>
                </div>
            </div>

            {reports.length === 0 ? (
                <GlassCard className="p-16 text-center text-gray-400 flex flex-col items-center justify-center border border-white/5">
                    <TrendingUp className="mb-4 text-white/10" size={64} />
                    <h2 className="text-xl font-bold text-gray-300 mb-2">Awaiting Telemetry</h2>
                    <p className="text-sm max-w-md">
                        Complete simulated patient encounters in the Training Terminal to generate AI performance reports.
                    </p>
                </GlassCard>
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    {reports.map((report, idx) => (
                        <motion.div
                            key={report.call_id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <GlassCard className="h-full group hover:border-accent-pink/40 transition-colors duration-300 flex flex-col">
                                <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-pink/20 flex items-center justify-center border border-white/10">
                                            <span className="font-mono text-sm font-bold text-white">#{report.call_id}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">Simulation ID</span>
                                            <span className="text-sm font-medium text-gray-200">
                                                {new Date(report.start_time).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    {report.severity === 'CRITICAL' ? (
                                        <span className="px-3 py-1 rounded border border-danger/30 bg-danger/10 text-danger text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <AlertTriangle size={14} /> High Severity
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 rounded border border-success/30 bg-success/10 text-success text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                            <CheckCircle2 size={14} /> Routine
                                        </span>
                                    )}
                                </div>

                                <div className="p-6 flex-1 flex flex-col gap-5">
                                    <div>
                                        <h4 className="text-xs text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Lightbulb size={14} className="text-accent-pink" />
                                            Proposed Diagnosis
                                        </h4>
                                        <div className="p-3 bg-black/40 rounded-lg border border-white/5 text-gray-300 font-medium text-sm">
                                            {report.diagnosis_given || 'N/A: Session Terminated Early'}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h4 className="text-xs text-gray-500 uppercase tracking-widest mb-2">AI Diagnostic Evaluation</h4>
                                        <div className="p-4 bg-gradient-to-b from-white/[0.05] to-transparent rounded-lg border border-white/5 text-gray-300 text-sm leading-relaxed h-full">
                                            {report.ai_feedback ? (
                                                <div className="whitespace-pre-wrap">{report.ai_feedback}</div>
                                            ) : (
                                                <span className="text-gray-500 italic">No automated feedback generated for this simulation.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}


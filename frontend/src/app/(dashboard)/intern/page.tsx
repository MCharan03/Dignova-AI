'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GraduationCap, Phone, History, Zap, Award, Target, Brain, ArrowRight, ShieldAlert } from 'lucide-react';

interface Report {
    id: number;
    score: number;
    feedback: string;
    missed_red_flags: string[];
    created_at: string;
}

export default function InternDashboard() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            const token = localStorage.getItem('access_token');
            try {
                // To be implemented: backend endpoint for training reports
                const response = await fetch('/api/calls/training-reports', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setReports(data);
                }
            } catch (err) {
                console.error("Failed to fetch reports");
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const averageScore = reports.length > 0 
        ? Math.round(reports.reduce((acc, curr) => acc + curr.score, 0) / reports.length) 
        : 0;

    return (
        <div className="flex flex-col gap-8 max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="px-2 py-0.5 rounded-md bg-accent-magenta/10 border border-accent-magenta/10 text-[9px] font-bold text-accent-magenta uppercase tracking-widest">
                            Training Node // Intern
                        </div>
                        <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-accent-magenta animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-4xl font-bold text-white tracking-tight leading-none">
                        Intern <span className="text-accent-magenta">Terminal</span>
                    </h2>
                </div>
                
                <GlassButton className="!rounded-xl border-accent-magenta/20 !px-6 !py-4 bg-accent-magenta/5 hover:bg-accent-magenta/10 group transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-magenta/20 rounded-lg group-hover:scale-110 transition-transform">
                            <Phone size={18} className="text-accent-magenta" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] font-bold text-accent-magenta uppercase tracking-tighter">Initialize Simulation</span>
                            <span className="text-xs font-bold text-white">Call AI Patient</span>
                        </div>
                    </div>
                </GlassButton>
            </header>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <GlassCard className="!p-6 border-accent-magenta/10 bg-accent-magenta/[0.02]">
                    <div className="flex items-center gap-3 mb-4 text-accent-magenta">
                        <Target size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">Skill Level</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">INTERN_V1</div>
                    <div className="w-full bg-white/5 h-1 rounded-full mt-3 overflow-hidden">
                        <div className="bg-accent-magenta h-full w-1/3 shadow-[0_0_10px_rgba(255,0,255,0.5)]" />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">Next Tier: Mid-Range (30% Progress)</p>
                </GlassCard>

                <GlassCard className="!p-6 border-accent-cyan/10 bg-accent-cyan/[0.02]">
                    <div className="flex items-center gap-3 mb-4 text-accent-cyan">
                        <Award size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">Avg. Score</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{averageScore}%</div>
                    <p className="text-[10px] text-gray-500 mt-2 font-mono">Based on {reports.length} sessions</p>
                </GlassCard>

                <GlassCard className="!p-6 border-success/10 bg-success/[0.02]">
                    <div className="flex items-center gap-3 mb-4 text-success">
                        <Zap size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">Active Streak</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">04 Days</div>
                    <p className="text-[10px] text-gray-500 mt-2 font-mono">Consistency: Optimal</p>
                </GlassCard>

                <GlassCard className="!p-6 border-white/5">
                    <div className="flex items-center gap-3 mb-4 text-gray-400">
                        <Brain size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">AI Feedback</span>
                    </div>
                    <div className="text-xs text-gray-300 italic leading-relaxed">
                        "Improve focus on patient history duration. Emotional empathy is high."
                    </div>
                </GlassCard>
            </div>

            {/* Recent Training Sessions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <GlassCard className="lg:col-span-8 !p-0 border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/[0.03] flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Performance Log</h3>
                        <History size={16} className="text-gray-500" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Session ID</th>
                                    <th>Score</th>
                                    <th>Primary Misses</th>
                                    <th>Timestamp</th>
                                    <th className="text-right">Full Report</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-gray-500 italic text-sm">
                                            No training data found. Start your first simulation.
                                        </td>
                                    </tr>
                                ) : (
                                    reports.map((report) => (
                                        <tr key={report.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="font-mono text-[10px] text-accent-magenta/60">#TRN-{report.id}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${report.score > 80 ? 'bg-success' : 'bg-warning'}`} />
                                                    <span className="font-bold text-white">{report.score}%</span>
                                                </div>
                                            </td>
                                            <td className="text-[10px] text-gray-400">
                                                {report.missed_red_flags.slice(0, 2).join(', ')}...
                                            </td>
                                            <td className="text-[10px] text-gray-500 uppercase">
                                                {new Date(report.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="text-right">
                                                <button className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all">
                                                    <ArrowRight size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                <div className="lg:col-span-4 flex flex-col gap-6">
                    <GlassCard className="!p-6 border-danger/10 bg-danger/[0.02]">
                        <div className="flex items-center gap-3 mb-6">
                            <ShieldAlert size={18} className="text-danger" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-danger">Critical Red Flags</h3>
                        </div>
                        <div className="space-y-4">
                            {[
                                "Radiation to Jaw",
                                "Onset Timing",
                                "Patient Allergy Check"
                            ].map((flag, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                                    <span className="text-xs text-gray-300 font-medium">{flag}</span>
                                    <div className="px-2 py-0.5 rounded-md bg-danger/10 text-danger text-[8px] font-black uppercase tracking-widest">Missed 2x</div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard className="!p-6 border-white/5 bg-black/40 flex-1 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <Zap size={40} className="text-accent-magenta opacity-5" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Training Strategy</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Focus on "Heart Attack" cases this week. Our system shows you are ready to move to "Stroke Identification" next.
                        </p>
                        <button className="mt-6 text-xs font-bold text-accent-magenta hover:underline flex items-center gap-2">
                            View Curriculum <ArrowRight size={12} />
                        </button>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}


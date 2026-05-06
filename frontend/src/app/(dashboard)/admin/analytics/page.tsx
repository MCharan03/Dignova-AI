'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { BarChart3, TrendingUp, Users, Activity, Brain, AlertTriangle, Zap, Building2 } from 'lucide-react';

interface AnalyticsData {
    call_volume_trend: { date: string; calls: number }[];
    severity_distribution: { name: string; value: number }[];
    call_type_breakdown: { name: string; value: number }[];
    age_demographics: { group: string; count: number }[];
    department_load: { name: string; bed_count: number; doctor_count: number; load_pct: number }[];
    ai_training_stats: { total_simulations: number; avg_score: number; avg_alignment: number; prediction_accuracy: number };
    doctor_availability: { online: number; total: number; availability_pct: number };
    total_patients: number;
    total_calls_period: number;
    recent_critical_alerts: { title: string; created_at: string }[];
    period_days: number;
}

const SEV_COLORS: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MODERATE: '#06b6d4', LOW: '#10b981', UNKNOWN: '#6b7280' };

function MiniBarChart({ data, colorKey = 'value' }: { data: { name: string; value: number }[]; colorKey?: string }) {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="flex items-end gap-1.5 h-24">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div className="w-full rounded-sm" style={{ height: `${(d.value / max) * 100}%`, background: SEV_COLORS[d.name] || '#06b6d4', minHeight: 4, opacity: 0.85 }} initial={{ scaleY: 0, transformOrigin: 'bottom' }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.05 }} />
                    <span className="text-[8px] font-mono text-white/30 truncate w-full text-center uppercase">{d.name.slice(0, 4)}</span>
                </div>
            ))}
        </div>
    );
}

function LineSparkChart({ data }: { data: { date: string; calls: number }[] }) {
    const max = Math.max(...data.map(d => d.calls), 1);
    const w = 100, h = 60;
    const pts = data.map((d, i) => ({ x: (i / Math.max(data.length - 1, 1)) * w, y: h - (d.calls / max) * (h - 8) - 4 }));
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const fill = `${path} L ${w} ${h} L 0 ${h} Z`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none">
            <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={fill} fill="url(#sparkGrad)" />
            <motion.path d={path} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: 'easeInOut' }} />
            {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2" fill="#06b6d4" />)}
        </svg>
    );
}

export default function AnalyticsDashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);
    const token = () => localStorage.getItem('access_token') || '';

    useEffect(() => {
        setLoading(true);
        fetch(`/api/stats/analytics/overview?days=${days}`, { headers: { Authorization: `Bearer ${token()}` } })
            .then(r => r.ok ? r.json() : null)
            .then(setData)
            .finally(() => setLoading(false));
    }, [days]);

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" /></div>;
    if (!data) return <div className="text-center text-white/40 py-20">Analytics unavailable</div>;

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase">Analytics</h1>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-1 flex items-center gap-2"><BarChart3 size={12} className="text-accent-cyan" /> Real-time Platform Intelligence</p>
                </div>
                <div className="flex gap-2">
                    {[7, 14, 30].map(d => (
                        <button key={d} onClick={() => setDays(d)} className={`px-4 py-1.5 rounded-full text-[10px] font-mono uppercase transition-all ${days === d ? 'bg-accent-cyan text-black font-black' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white'}`}>{d}D</button>
                    ))}
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Patients', value: data.total_patients, icon: <Users size={20} />, color: 'text-accent-cyan', bg: 'bg-accent-cyan/10 border-accent-cyan/20' },
                    { label: `Calls (${days}d)`, value: data.total_calls_period, icon: <Activity size={20} />, color: 'text-accent-purple', bg: 'bg-accent-purple/10 border-accent-purple/20' },
                    { label: 'Online Doctors', value: `${data.doctor_availability.online}/${data.doctor_availability.total}`, icon: <Zap size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
                    { label: 'AI Accuracy', value: `${data.ai_training_stats.prediction_accuracy}%`, icon: <Brain size={20} />, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
                ].map(kpi => (
                    <GlassCard key={kpi.label} className={`p-5 border ${kpi.bg}`}>
                        <div className={`${kpi.color} mb-2`}>{kpi.icon}</div>
                        <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
                        <p className="text-[9px] font-mono text-white/30 uppercase mt-1">{kpi.label}</p>
                    </GlassCard>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-6">
                    <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={14} /> Call Volume Trend</h3>
                    <LineSparkChart data={data.call_volume_trend} />
                    <div className="flex justify-between mt-2">
                        <span className="text-[9px] font-mono text-white/20">{data.call_volume_trend[0]?.date}</span>
                        <span className="text-[9px] font-mono text-white/20">{data.call_volume_trend[data.call_volume_trend.length - 1]?.date}</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={14} /> Severity Distribution</h3>
                    <MiniBarChart data={data.severity_distribution} />
                </GlassCard>
            </div>

            {/* Department Load Heatmap */}
            {data.department_load.length > 0 && (
                <GlassCard className="p-6">
                    <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2"><Building2 size={14} /> Department Load</h3>
                    <div className="space-y-3">
                        {data.department_load.map(dept => (
                            <div key={dept.name} className="flex items-center gap-4">
                                <span className="text-sm text-white/60 w-32 shrink-0 truncate">{dept.name}</span>
                                <div className="flex-1 h-6 bg-black/40 rounded-lg overflow-hidden border border-white/5 relative">
                                    <motion.div
                                        className="h-full rounded-lg"
                                        style={{ background: dept.load_pct > 80 ? '#ef4444' : dept.load_pct > 50 ? '#f59e0b' : '#10b981' }}
                                        initial={{ width: 0 }} animate={{ width: `${dept.load_pct}%` }} transition={{ duration: 0.8 }}
                                    />
                                    <span className="absolute inset-0 flex items-center px-3 text-[9px] font-mono text-white font-bold">{dept.load_pct}%</span>
                                </div>
                                <span className="text-[9px] font-mono text-white/30 w-20 text-right">{dept.doctor_count} docs / {dept.bed_count} beds</span>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* Bottom Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-6">
                    <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2"><Brain size={14} /> AI Training Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Simulations', value: data.ai_training_stats.total_simulations },
                            { label: 'Avg Score', value: `${data.ai_training_stats.avg_score}%` },
                            { label: 'Avg Alignment', value: `${data.ai_training_stats.avg_alignment}%` },
                            { label: 'Accuracy', value: `${data.ai_training_stats.prediction_accuracy}%` },
                        ].map(s => (
                            <div key={s.label} className="p-4 rounded-xl bg-black/30 border border-white/5 text-center">
                                <p className="text-xl font-black text-accent-purple">{s.value}</p>
                                <p className="text-[9px] font-mono text-white/30 uppercase mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {data.recent_critical_alerts.length > 0 && (
                    <GlassCard className="p-6">
                        <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={14} className="text-rose-400" /> Recent Alerts</h3>
                        <div className="space-y-2">
                            {data.recent_critical_alerts.map((a, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse mt-1.5 shrink-0" />
                                    <div><p className="text-xs text-white/70">{a.title}</p><p className="text-[9px] font-mono text-white/30">{new Date(a.created_at).toLocaleString()}</p></div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}

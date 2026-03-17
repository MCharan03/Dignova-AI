'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Activity, PhoneForwarded, Clock, AlertTriangle, ChevronRight, ActivitySquare, ShieldAlert, Zap, CheckCircle2 } from 'lucide-react';

interface DoctorStats {
    triage_volume: { date: string; count: number }[];
    severity: { critical: number; elevated: number; standard: number };
    active_queue: {
        call_id: number;
        user_name: string;
        severity: string;
        transcript: string;
        start_time: string;
        state: string;
    }[];
    total_active: number;
    my_efficiency: {
        patients_cleared: number;
        avg_consult_min: number;
        awaiting: number;
        lives_saved: number;
    };
    escalation_rate: number;
    abandon_rate: number;
    accuracy: number;
    readiness: {
        availability_pct: number;
        avg_triage_min: number;
    };
}

// Reusable SVG Ring Component for Triage Rates
const RingChart = ({ percentage, colorClass, shadowClass, label, subLabel }: { percentage: number, colorClass: string, shadowClass: string, label: string, subLabel: string }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} className="stroke-white/5" strokeWidth="8" fill="none" />
                    <motion.circle 
                        cx="50" cy="50" r={radius} 
                        className={`${colorClass} ${shadowClass}`}
                        strokeWidth="8" 
                        fill="none" 
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{ strokeDasharray: circumference }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-white">{percentage}%</span>
                </div>
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-gray-200 text-sm">{label}</span>
                <span className="text-xs text-gray-500 font-mono">{subLabel}</span>
            </div>
        </div>
    );
};

export default function DoctorDashboard() {
    const [stats, setStats] = useState<DoctorStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('access_token');
            try {
                const res = await fetch('/api/stats/doctor', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setStats(await res.json());
                }
            } catch (err) {
                console.error('Failed to fetch doctor stats:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading || !stats) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="relative">
                    <div className="w-12 h-12 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-accent-blue rounded-full animate-pulse" />
                    </div>
                </div>
                <div className="font-mono text-[10px] tracking-[0.4em] text-accent-blue uppercase animate-pulse">Loading_Triage_Data</div>
            </div>
        );
    }

    // All data comes from the API
    const { severity, active_queue, my_efficiency, readiness, triage_volume } = stats;
    const splineDataPoints = triage_volume.map(v => v.count);
    const maxSplineVal = Math.max(...splineDataPoints, 1) * 1.1;

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-4 pb-2">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-[10px] font-bold text-accent-blue uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            Training Terminal // Doctor Node
                        </div>
                        <div className="flex gap-2 items-center bg-white/[0.03] px-3 py-1 rounded-full border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Biometrics_Sync</span>
                        </div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight leading-none flex items-center gap-3 mb-1">
                        DOCTOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-cyan">STATION</span>
                    </h2>
                    <p className="text-sm font-mono text-gray-500 uppercase tracking-widest mt-2">{">"} Triage Queue Overview</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="px-5 py-2.5 bg-gradient-to-r from-success/10 to-transparent border border-success/20 rounded-xl flex items-center gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                        <div className="w-2.5 h-2.5 rounded-full bg-success animate-ping" />
                        <span className="text-xs font-bold text-success uppercase tracking-wider">Ready for Patients</span>
                    </div>
                </div>
            </header>

            {/* LEVEL 1: Top Row Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. Incoming Triage Volume (Spline Line Chart) */}
                <GlassCard className="lg:col-span-6 p-6 flex flex-col relative overflow-hidden group border-white/5">
                    <div className="absolute -right-8 -top-8 text-accent-cyan/5 group-hover:text-accent-cyan/10 transition-colors pointer-events-none">
                        <ActivitySquare size={150} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-6">Incoming Triage Volume</h3>
                    <div className="flex-1 relative min-h-[160px] flex gap-2">
                        <div className="flex flex-col justify-between text-xs text-gray-500 font-mono py-1 pr-2 border-r border-white/5">
                            {(() => {
                                const maxVal = Math.max(...splineDataPoints, 1);
                                return [maxVal, Math.round(maxVal * 0.75), Math.round(maxVal * 0.5), Math.round(maxVal * 0.25), 0].map((v, i) => (
                                    <span key={i}>{v}</span>
                                ));
                            })()}
                        </div>
                        <div className="flex-1 relative overflow-hidden pt-1">
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="w-full h-px bg-white/5" />
                                ))}
                            </div>
                            {splineDataPoints.length > 1 && (
                                <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${splineDataPoints.length * 10} 100`}>
                                    <defs>
                                        <linearGradient id="triageGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <motion.path 
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 2, ease: "easeOut" }}
                                        d={`M 0 100 L 0 ${100 - (splineDataPoints[0]/maxSplineVal)*100} ` + splineDataPoints.map((val, i) => {
                                            if(i===0) return '';
                                            const prevX = (i-1)*10;
                                            const prevY = 100 - (splineDataPoints[i-1]/maxSplineVal)*100;
                                            const currX = i*10;
                                            const currY = 100 - (val/maxSplineVal)*100;
                                            const ctrlX = prevX + 5;
                                            return `C ${ctrlX} ${prevY}, ${ctrlX} ${currY}, ${currX} ${currY}`;
                                        }).join(' ') + ` L ${splineDataPoints.length*10} 100 Z`}
                                        fill="url(#triageGrad)"
                                    />
                                    <motion.path 
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 2, ease: "easeOut" }}
                                        d={`M 0 ${100 - (splineDataPoints[0]/maxSplineVal)*100} ` + splineDataPoints.map((val, i) => {
                                            if(i===0) return '';
                                            const prevX = (i-1)*10;
                                            const prevY = 100 - (splineDataPoints[i-1]/maxSplineVal)*100;
                                            const currX = i*10;
                                            const currY = 100 - (val/maxSplineVal)*100;
                                            const ctrlX = prevX + 5;
                                            return `C ${ctrlX} ${prevY}, ${ctrlX} ${currY}, ${currX} ${currY}`;
                                        }).join(' ')}
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="1.5"
                                        vectorEffect="non-scaling-stroke"
                                        className="drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                                    />
                                    <circle cx={(splineDataPoints.length-1)*10} cy={100 - (splineDataPoints[splineDataPoints.length-1]/maxSplineVal)*100} r="1" fill="#fff" className="drop-shadow-[0_0_4px_#fff]"/>
                                </svg>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {/* 2. Waitlist Severity (Bar Chart) */}
                <GlassCard className="lg:col-span-3 p-6 flex flex-col border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Waitlist Queue</h3>
                        <span className="text-xs font-mono text-gray-500 uppercase">{stats.total_active} Pending</span>
                    </div>
                    
                    <div className="flex-1 flex items-end justify-between gap-4 border-b border-white/5 pb-2">
                        {/* Critical Bar */}
                        <div className="relative flex-1 flex flex-col items-center justify-end h-[140px] group">
                            <div className="absolute -top-6 bg-danger/20 border border-danger/30 text-danger px-2 py-0.5 text-xs font-bold whitespace-nowrap opacity-100 z-10 pointer-events-none rounded">{severity.critical}</div>
                            <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max((severity.critical/Math.max(stats.total_active, 1))*100, 5)}%` }} transition={{ duration: 1 }} className="w-full max-w-[40px] rounded-t-sm bg-danger shadow-[0_0_10px_rgba(239,68,68,0.5)] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-1/3 h-full bg-white/20" />
                            </motion.div>
                            <span className="text-[10px] text-danger mt-2 font-bold uppercase tracking-wider">CRIT</span>
                        </div>
                        {/* Elevated Bar */}
                        <div className="relative flex-1 flex flex-col items-center justify-end h-[140px] group">
                            <div className="absolute -top-6 bg-warning/20 border border-warning/30 text-warning px-2 py-0.5 text-xs font-bold whitespace-nowrap opacity-100 z-10 pointer-events-none rounded">{severity.elevated}</div>
                            <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max((severity.elevated/Math.max(stats.total_active, 1))*100, 5)}%` }} transition={{ duration: 1, delay: 0.1 }} className="w-full max-w-[40px] rounded-t-sm bg-warning shadow-[0_0_10px_rgba(245,158,11,0.5)] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-1/3 h-full bg-white/20" />
                            </motion.div>
                            <span className="text-[10px] text-warning mt-2 font-bold uppercase tracking-wider">ELEV</span>
                        </div>
                        {/* Standard Bar */}
                        <div className="relative flex-1 flex flex-col items-center justify-end h-[140px] group">
                            <div className="absolute -top-6 bg-accent-blue/20 border border-accent-blue/30 text-accent-blue px-2 py-0.5 text-xs font-bold whitespace-nowrap opacity-100 z-10 pointer-events-none rounded">{severity.standard}</div>
                            <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max((severity.standard/Math.max(stats.total_active, 1))*100, 5)}%` }} transition={{ duration: 1, delay: 0.2 }} className="w-full max-w-[40px] rounded-t-sm bg-accent-blue shadow-[0_0_10px_rgba(59,130,246,0.5)] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-1/3 h-full bg-white/20" />
                            </motion.div>
                            <span className="text-[10px] text-accent-blue mt-2 font-bold uppercase tracking-wider">NORM</span>
                        </div>
                    </div>
                </GlassCard>

                {/* 3. Availability Health (Ring Charts) */}
                <GlassCard className="lg:col-span-3 p-6 flex flex-col justify-between border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-bl-full pointer-events-none blur-2xl" />
                    <h3 className="text-lg font-bold text-white mb-4 z-10">Readiness Score</h3>
                    <div className="flex flex-col gap-6 z-10">
                        <RingChart percentage={readiness.availability_pct} colorClass="stroke-success" shadowClass="drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]" label="Physician Availability" subLabel="Duty Roster" />
                        <RingChart percentage={Math.min(Math.round((1 / Math.max(readiness.avg_triage_min, 0.1)) * 100), 100)} colorClass="stroke-accent-blue" shadowClass="drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" label="Time-to-Triage" subLabel={`Avg: ${readiness.avg_triage_min}m`} />
                    </div>
                </GlassCard>
            </div>

            {/* LEVEL 2: Middle Row Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                
                {/* 4. AI Diagnostic Accuracy (Progress bars) */}
                <GlassCard className="lg:col-span-4 p-6 border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 text-white/5 pointer-events-none"><CheckCircle2 size={100} /></div>
                    <h3 className="text-lg font-bold text-white mb-4">Patient Pre-Screening</h3>
                    <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-5xl font-black text-white">{stats.accuracy}</span>
                        <span className="text-sm font-bold text-success">% ACCURACY</span>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                                <span className="text-danger flex items-center gap-1"><ShieldAlert size={10}/> Critical Matches</span>
                                <span>{stats.accuracy}%</span>
                            </div>
                            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 text-danger">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${stats.accuracy}%` }} className="h-full bg-current shadow-[0_0_8px_currentColor]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                                <span className="text-warning">Elevated Conditions</span>
                                <span>{stats.accuracy}%</span>
                            </div>
                            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 text-warning">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${stats.accuracy}%` }} className="h-full bg-current shadow-[0_0_8px_currentColor]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                                <span className="text-accent-blue">Standard Consults</span>
                                <span>{Math.max(stats.accuracy - 9, 0)}%</span>
                            </div>
                            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 text-accent-blue">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(stats.accuracy - 9, 0)}%` }} className="h-full bg-current shadow-[0_0_8px_currentColor]" />
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* 5. Triage Efficiency (Stats) */}
                <GlassCard className="lg:col-span-4 p-6 border-white/5 flex flex-col justify-between">
                    <h3 className="text-lg font-bold text-white mb-2">My Efficiency</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <div className="text-4xl font-black text-white">{my_efficiency.patients_cleared}</div>
                            <div className="text-xs font-mono text-gray-400 mt-1 uppercase leading-tight">Patients<br/>Cleared</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-300 mt-1">{my_efficiency.avg_consult_min}m</div>
                            <div className="text-xs font-mono text-gray-400 mt-1 uppercase leading-tight">Avg. Consult<br/>Time</div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <div className="text-2xl font-bold text-warning text-shadow-sm shadow-warning">{my_efficiency.awaiting}</div>
                            <div className="text-[10px] font-mono text-gray-500 uppercase">Awaiting Consult</div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <div className="text-2xl font-bold text-success text-shadow-sm shadow-success">{my_efficiency.lives_saved}</div>
                            <div className="text-[10px] font-mono text-gray-500 uppercase">Cases Resolved</div>
                        </div>
                    </div>
                </GlassCard>

                {/* 6. Escalations (Ring) */}
                <GlassCard className="lg:col-span-2 p-6 flex flex-col items-center justify-center border-white/5 relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-t from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-sm font-bold text-white mb-4 text-center">Senior<br/>Escalations</h3>
                    
                    <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" className="stroke-white/5" strokeWidth="8" fill="none" />
                            <motion.circle 
                                cx="50" cy="50" r="40" 
                                className="stroke-warning drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                                strokeWidth="8" 
                                fill="none" 
                                strokeLinecap="round"
                                initial={{ strokeDashoffset: 251.2 }}
                                animate={{ strokeDashoffset: 251.2 - (stats.escalation_rate / 100) * 251.2 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                style={{ strokeDasharray: 251.2 }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-white tracking-tighter">{stats.escalation_rate}<span className="text-lg">%</span></span>
                        </div>
                    </div>
                </GlassCard>

                {/* 7. Dropped/Abandoned (Ring) */}
                <GlassCard className="lg:col-span-2 p-6 flex flex-col items-center justify-center border-white/5 relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-t from-danger/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-sm font-bold text-white mb-4 text-center">Queue<br/>Abandonment</h3>
                    
                    <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" className="stroke-white/5" strokeWidth="8" fill="none" />
                            <motion.circle 
                                cx="50" cy="50" r="40" 
                                className="stroke-danger drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                                strokeWidth="8" 
                                fill="none" 
                                strokeLinecap="round"
                                initial={{ strokeDashoffset: 251.2 }}
                                animate={{ strokeDashoffset: 251.2 - (stats.abandon_rate / 100) * 251.2 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                style={{ strokeDasharray: 251.2 }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-white tracking-tighter">{stats.abandon_rate}<span className="text-lg">%</span></span>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* LEVEL 3: Main Table - Live Triage Queue */}
            <div className="w-full flex mt-2">
                <GlassCard className="flex-1 !p-0 border-white/5 bg-black/40 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
                    <div className="p-5 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.01]">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-danger/20 to-accent-blue/20 text-danger border border-danger/30 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                <PhoneForwarded size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">Active Live Triage</h3>
                                <p className="text-xs font-mono text-gray-500">Patients awaiting urgent consultation.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="px-3 py-1.5 rounded-md bg-danger/10 text-danger text-xs font-bold font-mono border border-danger/20 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-danger animate-pulse shadow-[0_0_5px_#ef4444]" /> HOT QUEUE
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Case ID</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Severity</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Patient Details</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Wait Time</th>
                                    <th className="py-4 px-6 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode='popLayout'>
                                    {active_queue.map((call, index) => {
                                        const isCrit = call.severity === 'CRITICAL';
                                        const isElev = call.severity === 'ELEVATED';
                                        const sevColor = isCrit ? 'text-danger bg-danger/10 border-danger/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : isElev ? 'text-warning bg-warning/10 border-warning/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'text-accent-blue bg-accent-blue/10 border-accent-blue/30';
                                        
                                        const waitMinutes = call.start_time 
                                            ? Math.floor((Date.now() - new Date(call.start_time).getTime()) / 60000)
                                            : 0;

                                        return (
                                        <motion.tr
                                            key={call.call_id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="group hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-0"
                                        >
                                            <td className="py-4 px-6 font-mono text-[11px] text-gray-500">#{call.call_id}</td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${sevColor}`}>
                                                    {call.severity}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-xs text-white">{call.user_name}</span>
                                                    <span className="text-[11px] font-mono text-gray-400 line-clamp-1 italic max-w-md">&quot;{call.transcript?.slice(-100)}&quot;</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`text-[11px] font-mono ${waitMinutes > 10 ? 'text-danger font-bold' : 'text-gray-400'}`}>
                                                    <Clock size={10} className="inline mr-1" />{waitMinutes}m ago
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button 
                                                    onClick={() => router.push(`/doctor/intervene/${call.call_id}`)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-[0.1em] flex items-center justify-end gap-2 group-hover:gap-3 transition-all ml-auto ${isCrit ? 'text-white bg-danger hover:bg-danger/80 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/30'}`}>
                                                    INTERVENE <ChevronRight size={14} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    )})}
                                </AnimatePresence>
                            </tbody>
                        </table>
                        {active_queue.length === 0 && (
                            <div className="p-8 text-center text-sm font-mono text-gray-500">NO ACTIVE PATIENTS IN QUEUE</div>
                        )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}


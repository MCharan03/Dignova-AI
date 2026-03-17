'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { Activity, Users, Database, Save, Edit3, X, RefreshCcw, Cpu, Wifi, Zap, Terminal, AlertTriangle, ChevronRight, Binary, ServerCrash, CheckCircle2 } from 'lucide-react';

interface Resource {
    id: number;
    resource_type: string;
    total: number;
    available: number;
}

interface Call {
    call_id: number;
    user_id: number;
    diagnosis_given: string | null;
    state: string;
    start_time: string;
}

// Reusable SVG Ring Component for Uptime/Dropped rates
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

interface AdminStats {
    call_volume: { date: string; count: number }[];
    total_calls: number;
    active_calls: number;
    completed_calls: number;
    diagnosed_calls: number;
    accuracy: number;
    avg_duration_min: number;
    severity: { critical: number; elevated: number; standard: number };
    confidence: { high: number; medium: number; low: number };
    abandon_rate: number;
    fail_rate: number;
    resources: { type: string; total: number; available: number }[];
    health: { uptime: number; api_health: number };
    doctors: { total: number; online: number };
    input_stream: string;
    latency: string;
}

export default function AdminDashboardPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [calls, setCalls] = useState<Call[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [editingResource, setEditingResource] = useState<Resource | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    const apiBaseURL = "/api";

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
        setTerminalLogs(prev => [...prev.slice(-10), `[${time}] ${msg}`]);
    };

    const fetchData = async () => {
        setLoading(true);
        addLog("RE-SYNCING BIOMETRIC_NODES...");
        const token = localStorage.getItem('access_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const [resData, callData, statsData] = await Promise.all([
                fetch(`${apiBaseURL}/resources`, { headers }).then(r => r.json()),
                fetch(`${apiBaseURL}/calls`, { headers }).then(r => r.json()),
                fetch(`${apiBaseURL}/stats/admin`, { headers }).then(r => r.json())
            ]);

            setResources(Array.isArray(resData) ? resData : []);
            setCalls(Array.isArray(callData) ? callData : []);
            setStats(statsData);
            addLog("SYNC_COMPLETE // MATRIX_STABLE");
        } catch (err) {
            addLog("SYNC_ERROR // RETRYING...");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        addLog("OS_LAYER_BOOTED // AI_LINK_ESTABLISHED");
    }, []);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [terminalLogs]);

    const handleUpdateResource = async () => {
        if (!editingResource) return;
        setIsSaving(true);
        addLog(`MOD_REQ: ${editingResource.resource_type.toUpperCase()}`);
        const token = localStorage.getItem('access_token');

        try {
            const res = await fetch(`${apiBaseURL}/resources`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resource_type: editingResource.resource_type,
                    total: editingResource.total,
                    available: editingResource.available
                })
            });

            if (res.ok) {
                setEditingResource(null);
                await fetchData();
                addLog("MOD_SUCCESS // DATA_COMMITTED");
            }
        } catch (err) {
            addLog("MOD_FAILURE // ACCESS_DENIED");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="relative">
                    <div className="w-12 h-12 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse" />
                    </div>
                </div>
                <div className="font-mono text-[10px] tracking-[0.4em] text-accent-cyan uppercase animate-pulse">Initializing_OS_Layer</div>
            </div>
        );
    }

    // Real data from the API
    const accuracy = stats?.accuracy ?? 0;
    const activeCalls = stats?.active_calls ?? 0;
    const avgDuration = stats?.avg_duration_min ?? 0;
    const highConf = stats?.confidence.high ?? 0;
    const medConf = stats?.confidence.medium ?? 0;
    const lowConf = stats?.confidence.low ?? 0;
    const abandonRate = stats?.abandon_rate ?? 0;
    const failRate = stats?.fail_rate ?? 0;
    const uptimePct = stats?.health.uptime ?? 0;
    const apiHealthPct = stats?.health.api_health ?? 0;
    const inputStream = stats?.input_stream ?? '—';
    const latency = stats?.latency ?? '—';
    
    // Real time-series from API
    const splineDataPoints = (stats?.call_volume ?? []).map(v => v.count);
    const maxSplineVal = Math.max(...splineDataPoints, 1) * 1.1;

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header / Command Center */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-4 pb-2">
                <div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight leading-none mb-1">
                        CENTRAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-accent-purple">COMMAND DASHBOARD</span>
                    </h2>
                    <p className="text-sm font-mono text-gray-500 uppercase tracking-widest mt-2">{">"} System Metrics Overview</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden lg:block">
                        <div className="flex items-center gap-6 px-5 py-2.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl shadow-inner">
                            <div className="flex flex-col">
                                <span className="text-xs font-mono text-gray-500 uppercase">Input Stream</span>
                                <span className="font-bold text-sm text-white">{inputStream}</span>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-xs font-mono text-gray-500 uppercase">Latency</span>
                                <span className="font-bold text-sm text-success flex items-center gap-1"><div className="w-1.5 h-1.5 bg-success rounded-full shadow-[0_0_5px_rgba(16,185,129,0.5)] animate-pulse" /> {latency}</span>
                            </div>
                        </div>
                    </div>
                    <GlassButton onClick={fetchData} className="!rounded-xl border-white/10 !p-3 hover:bg-white/[0.05] bg-black/40 shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
                        <RefreshCcw size={20} className={`text-accent-cyan ${loading ? "animate-spin" : ""}`} />
                    </GlassButton>
                </div>
            </header>

            {/* TOP ROW: Widgets 1, 2, 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. System Call Volume (Spline Line Chart) - Spans 6 */}
                <GlassCard className="lg:col-span-6 p-6 flex flex-col relative overflow-hidden group border-white/5">
                    <div className="absolute -right-8 -top-8 text-accent-blue/5 group-hover:text-accent-blue/10 transition-colors pointer-events-none">
                        <Activity size={150} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-6">System Call Volume</h3>
                    <div className="flex-1 relative min-h-[160px] flex gap-2">
                        {/* Y-Axis Labels */}
                        <div className="flex flex-col justify-between text-xs text-gray-500 font-mono py-1 pr-2 border-r border-white/5">
                            <span>500</span>
                            <span>400</span>
                            <span>300</span>
                            <span>200</span>
                            <span>0</span>
                        </div>
                        {/* Chart Area */}
                        <div className="flex-1 relative overflow-hidden pt-1">
                            {/* Horizontal Grid lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="w-full h-px bg-white/5" />
                                ))}
                            </div>
                            {/* Spline Path */}
                            <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${splineDataPoints.length * 10} 100`}>
                                <defs>
                                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#00ffff" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="#00ffff" stopOpacity="0" />
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
                                    fill="url(#volGrad)"
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
                                    stroke="#00ffff"
                                    strokeWidth="1.5"
                                    vectorEffect="non-scaling-stroke"
                                    className="drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]"
                                />
                                {/* End Dot */}
                                <circle cx={(splineDataPoints.length-1)*10} cy={100 - (splineDataPoints[splineDataPoints.length-1]/maxSplineVal)*100} r="1" fill="#fff" className="drop-shadow-[0_0_4px_#fff]"/>
                            </svg>
                        </div>
                    </div>
                </GlassCard>

                {/* 2. Resource Availability (Bar Chart) - Spans 3*/}
                <GlassCard className="lg:col-span-3 p-6 flex flex-col border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Resource Pool</h3>
                        <button className="text-xs font-mono text-accent-cyan border border-accent-cyan/30 px-2 py-1 rounded bg-accent-cyan/10 hover:bg-accent-cyan/20 transition-colors">EDIT NODES</button>
                    </div>
                    
                    <div className="flex-1 flex items-end justify-between gap-2 border-b border-white/5 pb-2">
                        {resources.slice(0, 5).map((res, i) => {
                            const pct = Math.min((res.available / Math.max(res.total, 1)) * 100, 100);
                            const isCrit = pct < 20;
                            const isWarn = pct < 50 && !isCrit;
                            const color = isCrit ? 'bg-danger shadow-[0_0_10px_rgba(239,68,68,0.5)]' : isWarn ? 'bg-warning shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-accent-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]';
                            
                            return (
                                <div key={res.id} className="relative flex-1 flex flex-col items-center justify-end h-[140px] group cursor-pointer" onClick={() => setEditingResource(res)}>
                                    <div className="absolute -top-8 bg-black/80 border border-white/10 px-2 py-1 rounded text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                        {res.available}/{res.total}
                                    </div>
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: `${pct}%` }}
                                        transition={{ duration: 1, delay: i * 0.1 }}
                                        className={`w-full max-w-[30px] rounded-t-sm ${color} opacity-80 group-hover:opacity-100 transition-opacity relative overflow-hidden`}
                                    >
                                        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/20" />
                                    </motion.div>
                                    <span className="text-[10px] text-gray-400 mt-2 rotate-[-45deg] origin-top-left -ml-2 whitespace-nowrap uppercase tracking-wider overflow-hidden max-w-full text-ellipsis">{res.resource_type.slice(0, 7)}</span>
                                </div>
                            )
                        })}
                    </div>
                </GlassCard>

                {/* 3. Core Node Stability (Ring Charts) - Spans 3*/}
                <GlassCard className="lg:col-span-3 p-6 flex flex-col justify-between border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent-cyan/5 rounded-bl-full pointer-events-none blur-2xl" />
                    <h3 className="text-lg font-bold text-white mb-4 z-10">Node Stability</h3>
                    <div className="flex flex-col gap-6 z-10">
                        <RingChart 
                            percentage={Math.round(uptimePct)} 
                            colorClass="stroke-accent-cyan" 
                            shadowClass="drop-shadow-[0_0_6px_rgba(0,255,255,0.6)]"
                            label="System Uptime" 
                            subLabel="Core Cluster"
                        />
                        <RingChart 
                            percentage={Math.round(apiHealthPct)} 
                            colorClass="stroke-accent-blue" 
                            shadowClass="drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                            label="API Health" 
                            subLabel="Gateway Nodes"
                        />
                    </div>
                </GlassCard>
            </div>

            {/* BOTTOM ROW: Widgets 4, 5, 6, 7 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                
                {/* 4. Diagnostic Confidence (Progress bars) - Spans 4*/}
                <GlassCard className="lg:col-span-4 p-6 border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 text-white/5 pointer-events-none"><CheckCircle2 size={100} /></div>
                    <h3 className="text-lg font-bold text-white mb-4">Diagnostic Accuracy</h3>
                    <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-5xl font-black text-white">{accuracy}</span>
                        <span className="text-sm font-bold text-success">% OVERALL</span>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                                <span>High Confidence ({'>'}95%)</span>
                                <span>{highConf}%</span>
                            </div>
                            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 text-accent-cyan">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${highConf}%` }} className="h-full bg-current shadow-[0_0_8px_currentColor]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                                <span>Med Confidence (80-95%)</span>
                                <span>{medConf}%</span>
                            </div>
                            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 text-accent-blue">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${medConf}%` }} className="h-full bg-current shadow-[0_0_8px_currentColor]" />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                                <span>Low Confidence ({'<'}80%)</span>
                                <span>{lowConf}%</span>
                            </div>
                            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 text-danger">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${lowConf}%` }} className="h-full bg-current shadow-[0_0_8px_currentColor]" />
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* 5. Triage Efficiency (Stats) - Spans 4*/}
                <GlassCard className="lg:col-span-4 p-6 border-white/5 flex flex-col justify-between">
                    <h3 className="text-lg font-bold text-white mb-2">Triage Efficiency</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <div className="text-4xl font-black text-white">{activeCalls}</div>
                            <div className="text-xs font-mono text-gray-400 mt-1 uppercase leading-tight">Active<br/>Sessions</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-gray-300 mt-1">{avgDuration}m</div>
                            <div className="text-xs font-mono text-gray-400 mt-1 uppercase leading-tight">Avg.<br/>Triage Time</div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <div className="text-2xl font-bold text-danger text-shadow-sm shadow-danger">{abandonRate}%</div>
                            <div className="text-[10px] font-mono text-gray-500 uppercase">Abandon Rate</div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <div className="text-2xl font-bold text-success text-shadow-sm shadow-success">{accuracy}%</div>
                            <div className="text-[10px] font-mono text-gray-500 uppercase">Resolution Rate</div>
                        </div>
                    </div>
                </GlassCard>

                {/* 6. Dropped Requests (Single Large Ring) - Spans 2*/}
                <GlassCard className="lg:col-span-2 p-6 flex flex-col items-center justify-center border-white/5 relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-t from-danger/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-sm font-bold text-white mb-4 text-center">Abandoned<br/>Sessions</h3>
                    
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
                                animate={{ strokeDashoffset: 251.2 - (abandonRate / 100) * 251.2 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                style={{ strokeDasharray: 251.2 }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-white tracking-tighter">{abandonRate}<span className="text-lg">%</span></span>
                        </div>
                    </div>
                </GlassCard>

                {/* 7. Failed Requests (Single Large Ring) - Spans 2*/}
                <GlassCard className="lg:col-span-2 p-6 flex flex-col items-center justify-center border-white/5 relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-t from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-sm font-bold text-white mb-4 text-center">Failed<br/>Connections</h3>
                    
                    <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" className="stroke-white/5" strokeWidth="8" fill="none" />
                            <motion.circle 
                                cx="50" cy="50" r="40" 
                                className="stroke-warning drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]"
                                strokeWidth="8" 
                                fill="none" 
                                strokeLinecap="round"
                                initial={{ strokeDashoffset: 251.2 }}
                                animate={{ strokeDashoffset: 251.2 - (failRate / 100) * 251.2 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                style={{ strokeDasharray: 251.2 }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-white tracking-tighter">{failRate}<span className="text-lg">%</span></span>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Main Table - Spans full width underneath */}
            <div className="w-full flex mt-2">
                <GlassCard className="flex-1 !p-0 border-white/5 bg-black/40 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
                    <div className="p-5 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.01]">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 text-accent-cyan border border-accent-cyan/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                                <Terminal size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">System Logs</h3>
                                <p className="text-xs font-mono text-gray-500">Real-time operation history.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="px-3 py-1.5 rounded-md bg-success/10 text-success text-xs font-bold font-mono border border-success/20 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_5px_#10b981]" /> LIVE STREAM
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Node ID</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Subject UID</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">AI Diagnosis / Telemetry</th>
                                    <th className="py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="py-4 px-6 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode='popLayout'>
                                    {calls.slice(0, 10).map((call, index) => (
                                        <motion.tr
                                            key={call.call_id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="group hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-0"
                                        >
                                            <td className="py-4 px-6 font-mono text-[11px] text-accent-cyan/60">#{call.call_id}</td>
                                            <td className="py-4 px-6 font-bold text-xs text-gray-300">UID-{call.user_id}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20">
                                                        <Binary size={12} className="text-accent-blue" />
                                                    </div>
                                                    <span className="text-xs font-mono text-gray-300">
                                                        {call.diagnosis_given ? (
                                                            <span className="flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_5px_#10b981]" />
                                                                {call.diagnosis_given}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-500 italic flex items-center gap-2">
                                                                <div className="w-3 h-3 border border-gray-500 border-t-white rounded-full animate-spin" />
                                                                Analyzing stream...
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${call.state === 'active' ? 'bg-accent-magenta/20 text-accent-magenta border border-accent-magenta/30 shadow-[0_0_10px_rgba(255,0,255,0.2)]' : 'bg-gray-800 text-gray-400 border border-white/10'}`}>
                                                    {call.state}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                        {calls.length === 0 && (
                            <div className="p-8 text-center text-sm font-mono text-gray-500">NO TELEMETRY STREAMS ACTIVE</div>
                        )}
                    </div>
                </GlassCard>
            </div>


            {/* Resource Edit Modal */}
            <AnimatePresence>
                {editingResource && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            className="w-full max-w-md"
                        >
                            <GlassCard className="!p-8 border-accent-cyan/30 shadow-[0_0_40px_rgba(0,255,255,0.15)] bg-black/90">
                                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                                    <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                        <Database className="text-accent-cyan" /> Configure Node
                                    </h3>
                                    <button onClick={() => setEditingResource(null)} className="text-gray-500 hover:text-white transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Node Designation</label>
                                        <div className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono uppercase bg-[url('/noise.png')] opacity-80">
                                            {editingResource.resource_type}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Max Capacity Limit</label>
                                        <input
                                            type="number"
                                            value={editingResource.total}
                                            onChange={(e) => setEditingResource({ ...editingResource, total: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-cyan/50 focus:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all font-mono"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono text-accent-cyan uppercase tracking-widest">Current Availability</label>
                                        <input
                                            type="number"
                                            value={editingResource.available}
                                            onChange={(e) => setEditingResource({ ...editingResource, available: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-black/50 border border-accent-cyan/30 rounded-lg px-4 py-3 text-accent-cyan font-bold focus:outline-none focus:border-accent-cyan focus:shadow-[0_0_15px_rgba(0,255,255,0.4)] transition-all font-mono"
                                        />
                                    </div>

                                    <div className="pt-6 border-t border-white/10">
                                        <button
                                            className="w-full py-4 rounded-lg bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan font-bold font-mono tracking-widest uppercase text-sm flex items-center justify-center gap-2 transition-all border border-accent-cyan/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={handleUpdateResource}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? <><RefreshCcw className="animate-spin" size={18} /> Syncing...</> : <><Save size={18} /> Update Node Matrix</>}
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


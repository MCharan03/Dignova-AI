'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Activity, Heart, Search, Bell, Droplets, Wind, Shield, UserCircle, Calendar, ShieldCheck, ArrowUpRight, Star, Clock, Briefcase, Stethoscope, CreditCard } from 'lucide-react';

interface UserStats {
    vitals: {
        heart_rate: number | null;
        systolic_bp: number | null;
        diastolic_bp: number | null;
        spo2: number | null;
        temperature: string | null;
        recorded_at: string | null;
    };
    vitals_chart: { hr: number; systolic: number; diastolic: number; spo2: number; time: string }[];
    recent_calls: { call_id: number; diagnosis: string | null; state: string; severity: string; start_time: string }[];
    active_sessions: number;
    assigned_doctors: { id: number; name: string; specialty: string | null; is_online: boolean; qualification: string | null; department: string | null; experience_years: number | null; rating: number | null; consultation_fee: number | null; languages: string | null; available_hours: string | null }[];
    system_status: string;
    profile: {
        name: string;
        email: string;
        blood_group: string | null;
        age: number | null;
        emergency_contact: string | null;
    };
}

export default function UserDashboard() {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('access_token');
            try {
                const res = await fetch('/api/stats/user', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setStats(await res.json());
                }
            } catch (err) {
                console.error('Failed to fetch user stats:', err);
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
                    <div className="w-12 h-12 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse" />
                    </div>
                </div>
                <div className="font-mono text-[10px] tracking-[0.4em] text-accent-cyan uppercase animate-pulse">Syncing_Identity_Layer</div>
            </div>
        );
    }

    const { vitals, vitals_chart, profile, assigned_doctors, recent_calls, active_sessions, system_status } = stats;

    // Build SVG path from real vitals chart data
    const hrPoints = vitals_chart.map(v => v.hr);
    const maxHR = Math.max(...hrPoints, 1);
    const minHR = Math.min(...hrPoints, 0);
    const hrRange = maxHR - minHR || 1;

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Activity className="text-accent-cyan" />
                    IDENTITY DASHBOARD
                </h2>
                
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search systems..." 
                            className="bg-black/40 border border-white/10 rounded-full py-2 pl-4 pr-10 text-sm text-gray-300 focus:outline-none focus:border-accent-cyan/50 font-mono w-64 transition-all"
                        />
                        <Search className="absolute right-3 top-2.5 text-gray-500" size={16} />
                    </div>
                    <button className="p-2 rounded-full bg-black/40 border border-white/10 text-gray-400 hover:text-accent-cyan transition-colors">
                        <Bell size={18} />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center overflow-hidden">
                        <UserCircle size={24} className="text-accent-blue" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
                {/* Column 1: Anatomy Base (Span 4) */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center relative">
                    <GlassCard className="w-full h-[600px] flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.05)_0%,transparent_70%)]" />
                        
                        <motion.div 
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="relative w-64 h-[500px] flex flex-col items-center justify-center"
                        >
                            {/* Head Area */}
                            <div className="w-16 h-20 rounded-[40%] bg-gradient-to-b from-accent-cyan/20 to-transparent border border-accent-cyan/30 backdrop-blur-md mb-2 relative">
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-accent-cyan rounded-full animate-pulse shadow-[0_0_15px_#00ffff]" />
                            </div>
                            {/* Torso Area */}
                            <div className="w-32 h-64 rounded-[30%] bg-gradient-to-b from-accent-blue/10 to-transparent border border-accent-blue/30 backdrop-blur-md relative">
                                {/* Heart Node */}
                                <div className="absolute top-12 left-16 w-3 h-3 bg-danger rounded-full shadow-[0_0_10px_#ff003c] cursor-pointer hover:scale-150 transition-transform z-10">
                                    <div className="absolute w-24 h-[1px] bg-danger/50 -right-24 top-1 origin-left rotate-[-15deg]" />
                                </div>
                                {/* Lung Nodes */}
                                <div className="absolute top-20 left-6 w-2 h-2 bg-accent-cyan rounded-full shadow-[0_0_8px_#00ffff]" />
                                <div className="absolute top-20 right-6 w-2 h-2 bg-accent-cyan rounded-full shadow-[0_0_8px_#00ffff]" />
                                {/* Stomach Node */}
                                <div className="absolute top-36 left-12 w-2 h-2 bg-success rounded-full shadow-[0_0_8px_#00ff00]" />
                            </div>
                            {/* Legs */}
                            <div className="flex gap-4 mt-2">
                                <div className="w-8 h-40 rounded-full bg-gradient-to-b from-white/5 to-transparent border-t border-white/10" />
                                <div className="w-8 h-40 rounded-full bg-gradient-to-b from-white/5 to-transparent border-t border-white/10" />
                            </div>
                            
                            <motion.div 
                                className="absolute w-full h-[2px] bg-accent-cyan/50 shadow-[0_0_10px_#00ffff]"
                                animate={{ top: ["10%", "90%", "10%"] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            />
                        </motion.div>

                        <button className="absolute bottom-6 bg-accent-blue/20 hover:bg-accent-blue/40 border border-accent-blue/50 text-white px-6 py-2 rounded-full font-mono text-sm uppercase tracking-wider backdrop-blur-md transition-all hover:shadow-[0_0_20px_rgba(0,102,255,0.4)] flex items-center gap-2">
                            Explore Neural Link <ArrowUpRight size={16} />
                        </button>
                    </GlassCard>
                </div>

                {/* Column 2: Vitals & Core Systems (Span 4) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Main Vital Widget — Real Data */}
                    <GlassCard className="p-6 relative overflow-hidden group">
                        <div className="absolute -right-10 -top-10 text-danger/10 group-hover:text-danger/20 transition-colors">
                            <Heart size={150} />
                        </div>
                        <h3 className="text-danger font-bold text-xl mb-4 flex items-center gap-2">Core Rhythm</h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="space-y-1 bg-black/30 p-3 rounded-lg border border-white/5">
                                <p className="text-xs text-gray-400 font-mono flex items-center gap-1"><Droplets size={12}/> Systolic/Diastolic</p>
                                <p className="text-2xl font-black text-white">{vitals.systolic_bp ?? '—'}<span className="text-sm font-normal text-gray-500">/{vitals.diastolic_bp ?? '—'}</span></p>
                            </div>
                            <div className="space-y-1 bg-black/30 p-3 rounded-lg border border-white/5">
                                <p className="text-xs text-gray-400 font-mono flex items-center gap-1"><Activity size={12}/> Pulse Frequency</p>
                                <p className="text-2xl font-black text-danger animate-pulse">{vitals.heart_rate ?? '—'} <span className="text-sm font-normal text-gray-500">BPM</span></p>
                            </div>
                            <div className="space-y-1 bg-black/30 p-3 rounded-lg border border-white/5">
                                <p className="text-xs text-gray-400 font-mono flex items-center gap-1"><Activity size={12}/> SpO2 Level</p>
                                <p className="text-lg font-bold text-success">{vitals.spo2 ?? '—'}<span className="text-sm font-normal text-gray-500">%</span></p>
                            </div>
                            <div className="space-y-1 bg-black/30 p-3 rounded-lg border border-white/5">
                                <p className="text-xs text-gray-400 font-mono flex items-center gap-1"><Shield size={12}/> Temperature</p>
                                <p className="text-lg font-bold text-white">{vitals.temperature ?? '—'}</p>
                            </div>
                        </div>

                        {/* Spline Chart from Real Vitals History */}
                        <div className="w-full h-32 bg-black/40 rounded-xl border border-white/5 flex items-end p-2 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,60,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,60,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
                            {hrPoints.length > 1 && (
                                <svg viewBox={`0 0 ${hrPoints.length * 40} 100`} className="w-full h-full drop-shadow-[0_0_8px_rgba(255,0,60,0.8)] opacity-80" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#ff003c" stopOpacity="0.2" />
                                            <stop offset="50%" stopColor="#ff003c" stopOpacity="1" />
                                            <stop offset="100%" stopColor="#ff003c" stopOpacity="0.2" />
                                        </linearGradient>
                                    </defs>
                                    <motion.path 
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 2, ease: "easeInOut" }}
                                        d={`M 0 ${100 - ((hrPoints[0] - minHR) / hrRange) * 80 - 10} ` + hrPoints.map((hr, i) => {
                                            if(i === 0) return '';
                                            const x = i * 40;
                                            const y = 100 - ((hr - minHR) / hrRange) * 80 - 10;
                                            const prevX = (i-1) * 40;
                                            const prevY = 100 - ((hrPoints[i-1] - minHR) / hrRange) * 80 - 10;
                                            const ctrlX = prevX + 20;
                                            return `C ${ctrlX} ${prevY}, ${ctrlX} ${y}, ${x} ${y}`;
                                        }).join(' ')}
                                        fill="none" 
                                        stroke="url(#lineGrad)" 
                                        strokeWidth="3"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                </svg>
                            )}
                        </div>
                    </GlassCard>

                    {/* Sub-system Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <GlassCard className="p-4 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors cursor-pointer group">
                            <div className="w-16 h-16 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:shadow-[0_0_20px_rgba(255,0,60,0.4)]">
                                <Heart className="text-danger" size={32} />
                            </div>
                            <span className="text-sm font-mono text-gray-300">My Heart ↗</span>
                        </GlassCard>
                        <GlassCard className="p-4 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors cursor-pointer group">
                            <div className="w-16 h-16 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:shadow-[0_0_20px_rgba(0,255,255,0.4)]">
                                <Droplets className="text-accent-cyan" size={32} />
                            </div>
                            <span className="text-sm font-mono text-gray-300">Blood Profile</span>
                        </GlassCard>
                        <GlassCard className="p-4 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors cursor-pointer group">
                            <div className="w-16 h-16 rounded-full bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:shadow-[0_0_20px_rgba(0,102,255,0.4)]">
                                <Wind className="text-accent-blue" size={32} />
                            </div>
                            <span className="text-sm font-mono text-gray-300">Respiratory</span>
                        </GlassCard>
                        <GlassCard className="p-4 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors cursor-pointer group">
                            <div className="w-16 h-16 rounded-full bg-success/10 border border-success/30 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:shadow-[0_0_20px_rgba(0,255,0,0.4)]">
                                <Shield className="text-success" size={32} />
                            </div>
                            <span className="text-sm font-mono text-gray-300">Immune Sys</span>
                        </GlassCard>
                    </div>
                </div>

                {/* Column 3: Identity & Medical Team (Span 4) — Real Data */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Patient Overview — From API */}
                    <GlassCard className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Subject: {profile.name?.split(' ')[0]?.toUpperCase()}</h3>
                                <p className="text-xs font-mono text-gray-400">{profile.email}</p>
                            </div>
                            <div className="px-2 py-1 bg-success/20 border border-success/30 text-success text-xs font-bold rounded">VERIFIED</div>
                        </div>

                        <div className="grid grid-cols-3 gap-y-6 gap-x-2 text-sm">
                            <div>
                                <p className="text-xs text-gray-500 font-mono mb-1">Blood</p>
                                <p className="font-bold text-white">{profile.blood_group ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-mono mb-1">Age</p>
                                <p className="font-bold text-white">{profile.age ?? '—'} Y</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-mono mb-1">Status</p>
                                <p className="font-bold text-success text-sm">{system_status === 'Active Triage In Progress' ? 'IN TRIAGE' : 'NOMINAL'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-mono mb-1">Sessions</p>
                                <p className="font-bold text-white">{active_sessions}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-mono mb-1">Total Calls</p>
                                <p className="font-bold text-white">{recent_calls.length}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-mono mb-1">Emergency</p>
                                <p className="font-bold text-accent-cyan text-xs">{profile.emergency_contact ?? '—'}</p>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Consulting Doctors — With Full Profiles */}
                    <GlassCard className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Medical Handlers</h3>
                            <span className="text-xs text-gray-500 font-mono">{assigned_doctors.length} ASSIGNED</span>
                        </div>
                        <div className="space-y-4">
                            {assigned_doctors.map((doc) => (
                                <div key={doc.id} className="p-4 bg-black/40 rounded-xl border border-white/5 hover:border-accent-cyan/20 transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-11 h-11 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-sm font-bold text-accent-cyan">
                                                    {doc?.name ? doc.name.split(' ').map(w => w[0]).join('').slice(0, 2) : 'DR'}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1117] ${doc.is_online ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-gray-600'}`} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-white">{doc.name || 'Unknown Doctor'}</p>
                                                <p className="text-[11px] text-gray-400">
                                                    {doc.specialty || 'General'} {doc.department ? `• ${doc.department}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        {doc.rating && (
                                            <span className="text-xs text-yellow-400 flex items-center gap-1">
                                                <Star size={11} fill="currentColor" />
                                                {doc.rating}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {doc.qualification && (
                                        <p className="text-[10px] text-gray-500 mt-2 font-mono">{doc.qualification}</p>
                                    )}
                                    
                                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                                        {doc.experience_years && (
                                            <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">{doc.experience_years} yrs exp</span>
                                        )}
                                        {doc.consultation_fee && (
                                            <span className="text-[10px] text-green-400 bg-green-400/5 px-2 py-0.5 rounded border border-green-500/20">₹{doc.consultation_fee}</span>
                                        )}
                                        {doc.languages && (
                                            <span className="text-[10px] text-accent-blue bg-accent-blue/5 px-2 py-0.5 rounded border border-accent-blue/20">{doc.languages}</span>
                                        )}
                                    </div>

                                    {doc.available_hours && (
                                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5">
                                            <Clock size={11} className="text-gray-500" />
                                            <span className="text-[10px] text-gray-400 font-mono tracking-wider">{doc.available_hours}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {assigned_doctors.length === 0 && (
                                <p className="text-xs text-gray-500 font-mono text-center py-4">No doctors assigned yet</p>
                            )}
                        </div>
                    </GlassCard>

                    {/* Recent Calls — Real Data */}
                    <GlassCard className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white">Recent Triage Sessions</h3>
                        </div>
                        <div className="space-y-3">
                            {recent_calls.slice(0, 4).map((call) => (
                                <div key={call.call_id} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${call.state === 'active' ? 'bg-accent-magenta animate-pulse shadow-[0_0_8px_#ff00ff]' : call.state === 'completed' ? 'bg-success' : 'bg-gray-500'}`} />
                                        <div>
                                            <p className="text-xs font-mono text-gray-300">{call.diagnosis ?? 'In Progress...'}</p>
                                            <p className="text-[10px] font-mono text-gray-500">{call.start_time ? new Date(call.start_time).toLocaleDateString() : '—'}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                        call.severity === 'CRITICAL' ? 'bg-danger/20 text-danger border border-danger/30' :
                                        call.severity === 'ELEVATED' ? 'bg-warning/20 text-warning border border-warning/30' :
                                        'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                                    }`}>{call.severity}</span>
                                </div>
                            ))}
                            {recent_calls.length === 0 && (
                                <p className="text-xs text-gray-500 font-mono text-center py-4">No triage sessions yet</p>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}


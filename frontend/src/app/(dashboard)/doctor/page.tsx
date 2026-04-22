'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Activity, Users, Clock, Shield, AlertTriangle, ChevronRight, Search, Bell, UserCircle, Zap, CheckCircle, Calendar, Sparkles, Stethoscope } from 'lucide-react';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';

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

export default function DoctorDashboard() {
    const [stats, setStats] = useState<DoctorStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [escalations, setEscalations] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'schedule'>('overview');

    const fetchDoctorData = async () => {
        const token = localStorage.getItem('access_token');
        try {
            const [statsRes, apptsRes, escRes] = await Promise.all([
                fetch('/api/stats/doctor', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/appointments/me', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hospital/escalations/active', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (apptsRes.ok) setAppointments(await apptsRes.json());
            if (escRes.ok) setEscalations(await escRes.json());
        } catch (err) {
            console.error('Failed to fetch doctor data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctorData();
        const interval = setInterval(fetchDoctorData, 10000); // Dynamic feed
        return () => clearInterval(interval);
    }, []);

    const handleApproveEscalation = async (callId: number) => {
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`/api/hospital/escalations/${callId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchDoctorData(); // Refresh feed
            }
        } catch (err) {
            console.error('Failed to approve escalation:', err);
        }
    };

    if (loading || !stats) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="relative">
                    <div className="w-12 h-12 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-accent-blue rounded-full animate-pulse" />
                    </div>
                </div>
                <div className="font-mono text-[10px] tracking-[0.4em] text-accent-blue uppercase animate-pulse">Establishing_Neural_Link</div>
            </div>
        );
    }

    const { triage_volume, severity, active_queue, total_active, my_efficiency, accuracy, readiness } = stats;

    return (
        <div className="flex flex-col h-full space-y-8 pb-20">
            <header className="flex flex-col gap-2">
                <SplitText text="CLINICAL COMMAND CENTER" className="text-3xl font-black text-white tracking-[0.2em]" />
                <BlurIn delay={0.2}>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.1em] flex items-center gap-2">
                        <Activity className="text-accent-blue" size={14} /> Node_Type: Medical_Command // Priority: Alpha
                    </p>
                </BlurIn>
            </header>
            
            <div className="flex justify-between items-center mb-4">
                <BlurIn delay={0.3}>
                    <div className="flex bg-black/40 border border-white/10 rounded-full p-1">
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-mono transition-all ${activeTab === 'overview' ? 'bg-accent-blue text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            OVERVIEW
                        </button>
                        <button 
                            onClick={() => setActiveTab('queue')}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-mono transition-all ${activeTab === 'queue' ? 'bg-accent-magenta text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            LIVE_QUEUE ({total_active})
                        </button>
                        <button 
                            onClick={() => setActiveTab('schedule')}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-mono transition-all ${activeTab === 'schedule' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            SCHEDULE
                        </button>
                    </div>
                </BlurIn>
                
                <div className="w-10 h-10 rounded-full bg-accent-cyan/20 border border-accent-cyan/30 flex items-center justify-center overflow-hidden">
                    <UserCircle size={24} className="text-accent-cyan" />
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-12 gap-6">
                        {/* LEFT: AI Alerts & Queue Preview */}
                        <div className="col-span-8 space-y-6">
                            <BlurIn delay={0.4}>
                                {/* AI Emergency Alerts */}
                                <GlassCard className="border-danger/30 bg-danger/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-lg bg-danger/20">
                                            <AlertTriangle className="text-danger" size={20} />
                                        </div>
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Emergency Alerts</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {active_queue.filter(c => c.severity === 'CRITICAL').map((alert) => (
                                            <div key={alert.call_id} className="flex items-center justify-between p-4 rounded-xl bg-black/60 border border-danger/20 hover:border-danger/50 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-2 h-2 rounded-full bg-danger animate-ping" />
                                                    <div>
                                                        <h4 className="text-white font-bold text-sm">CRITICAL_EVENT: {alert.user_name}</h4>
                                                        <p className="text-[10px] text-gray-500 font-mono truncate max-w-md italic">&quot;{alert.transcript}&quot;</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => window.location.href=`/doctor/intervene/${alert.call_id}`}
                                                    className="px-4 py-2 rounded-lg bg-danger/20 border border-danger/30 text-danger text-[10px] font-mono uppercase hover:bg-danger hover:text-white transition-all"
                                                >
                                                    INTERVENE
                                                </button>
                                            </div>
                                        ))}
                                        {active_queue.filter(c => c.severity === 'CRITICAL').length === 0 && (
                                            <p className="text-xs text-gray-500 font-mono text-center py-4 italic">No critical interventions flagged</p>
                                        )}
                                    </div>
                                </GlassCard>

                                {/* DYNAMIC PRIORITY INBOX (Automation 03 Sync) */}
                                <GlassCard className="border-accent-magenta/30 bg-accent-magenta/5">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-accent-magenta/20">
                                                <Bell className="text-accent-magenta" size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Neural Escalation Feed</h3>
                                                <p className="text-[9px] font-mono text-accent-magenta/60 uppercase">Real-time sync with Telegram Bot</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono text-white/20 uppercase tracking-tighter">Level_03_Active</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {escalations.map((esc) => (
                                            <div key={esc.call_id} className="p-4 rounded-xl bg-black/60 border border-white/5 space-y-4 hover:border-accent-magenta/40 transition-all relative group overflow-hidden">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-[10px] font-mono text-accent-magenta uppercase mb-1">Case #{esc.call_id}</p>
                                                        <h4 className="text-sm font-bold text-white uppercase tracking-tight">{esc.user_name}</h4>
                                                    </div>
                                                    <div className="px-2 py-0.5 rounded bg-danger/20 border border-danger/30 text-[8px] font-black text-danger uppercase tracking-widest animate-pulse">High_Risk</div>
                                                </div>
                                                
                                                <div className="space-y-2 py-2 border-y border-white/5">
                                                    <p className="text-[10px] text-gray-400 font-mono leading-tight truncate">&quot;{esc.transcript?.slice(-60)}&quot;</p>
                                                </div>

                                                <div className="flex gap-2 pt-2">
                                                    <button 
                                                        onClick={() => handleApproveEscalation(esc.call_id)}
                                                        className="flex-1 py-1.5 rounded bg-success/20 border border-success/30 text-success text-[9px] font-bold uppercase hover:bg-success hover:text-white transition-all"
                                                    >
                                                        Quick Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => window.location.href=`/doctor/intervene/${esc.call_id}`}
                                                        className="px-3 py-1.5 rounded bg-white/5 border border-white/10 text-white text-[9px] font-bold uppercase hover:bg-white/10 transition-all"
                                                    >
                                                        Review
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {escalations.length === 0 && (
                                            <div className="col-span-2 py-10 text-center border border-dashed border-white/5 rounded-2xl">
                                                <CheckCircle className="mx-auto mb-2 text-white/10" size={24} />
                                                <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">Escalation queue nominal</p>
                                            </div>
                                        )}
                                    </div>
                                </GlassCard>
                            </BlurIn>

                            <BlurIn delay={0.5}>
                                {/* Metrics Row */}
                                <div className="grid grid-cols-4 gap-4">
                                    <GlassCard className="flex flex-col items-center justify-center p-6 group hover:border-accent-blue/40 transition-all">
                                        <Zap className="text-accent-blue mb-2 group-hover:scale-110 transition-transform" size={28} />
                                        <span className="text-2xl font-bold text-white">{accuracy}%</span>
                                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">AI_ACCURACY</span>
                                    </GlassCard>
                                    <GlassCard className="flex flex-col items-center justify-center p-6 group hover:border-accent-cyan/40 transition-all">
                                        <Users className="text-accent-cyan mb-2 group-hover:scale-110 transition-transform" size={28} />
                                        <span className="text-2xl font-bold text-white">{my_efficiency.patients_cleared}</span>
                                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">CLEARED</span>
                                    </GlassCard>
                                    <GlassCard className="flex flex-col items-center justify-center p-6 group hover:border-accent-magenta/40 transition-all">
                                        <Clock className="text-accent-magenta mb-2 group-hover:scale-110 transition-transform" size={28} />
                                        <span className="text-2xl font-bold text-white">{my_efficiency.avg_consult_min}m</span>
                                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">AVG_TIME</span>
                                    </GlassCard>
                                    <GlassCard className="flex flex-col items-center justify-center p-6 group hover:border-success/40 transition-all">
                                        <Shield className="text-success mb-2 group-hover:scale-110 transition-transform" size={28} />
                                        <span className="text-2xl font-bold text-white">{readiness.availability_pct}%</span>
                                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">READINESS</span>
                                    </GlassCard>
                                </div>
                            </BlurIn>
                        </div>

                        {/* RIGHT: Status & Schedule Preview */}
                        <div className="col-span-4 space-y-6">
                            <BlurIn delay={0.6}>
                                <GlassCard>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Calendar className="text-purple-400" size={18} />
                                        UPCOMING_CONSULTS
                                    </h3>
                                    <div className="space-y-3">
                                        {appointments.slice(0, 3).map((appt) => (
                                            <div key={appt.id} className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-white">{new Date(appt.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase font-mono">Patient_ID: {appt.patient_id}</p>
                                                </div>
                                                <div className="text-[10px] font-mono text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded uppercase">Scheduled</div>
                                            </div>
                                        ))}
                                        {appointments.length === 0 && (
                                            <p className="text-xs text-gray-500 font-mono text-center py-4 italic">No appointments today</p>
                                        )}
                                    </div>
                                </GlassCard>
                            </BlurIn>
                        </div>
                    </div>
                )}

                {activeTab === 'queue' && (
                    <motion.div 
                        key="queue"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <GlassCard className="!p-0 border-white/5 bg-black/40 overflow-hidden">
                            <div className="p-5 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.01]">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-danger/20 to-accent-blue/20 text-danger border border-danger/30 flex items-center justify-center">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white tracking-tight">Active Live Triage</h3>
                                        <p className="text-xs font-mono text-gray-500">Patients awaiting urgent consultation.</p>
                                    </div>
                                </div>
                                <div className="px-3 py-1.5 rounded-md bg-danger/10 text-danger text-xs font-bold font-mono border border-danger/20 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-danger animate-pulse shadow-[0_0_5px_#ef4444]" /> HOT QUEUE
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
                                        {active_queue.map((call, index) => {
                                            const isCrit = call.severity === 'CRITICAL';
                                            const isElev = call.severity === 'ELEVATED';
                                            const sevColor = isCrit ? 'text-danger bg-danger/10 border-danger/30' : isElev ? 'text-warning bg-warning/10 border-warning/30' : 'text-accent-blue bg-accent-blue/10 border-accent-blue/30';
                                            
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
                                                        onClick={() => window.location.href = `/doctor/intervene/${call.call_id}`}
                                                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-[0.1em] flex items-center justify-end gap-2 group-hover:gap-3 transition-all ml-auto ${isCrit ? 'text-white bg-danger hover:bg-danger/80 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/30'}`}>
                                                        INTERVENE <ChevronRight size={14} />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        )})}
                                    </tbody>
                                </table>
                                {active_queue.length === 0 && (
                                    <div className="p-8 text-center text-sm font-mono text-gray-500">NO ACTIVE PATIENTS IN QUEUE</div>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>
                )}

                {activeTab === 'schedule' && (
                    <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
                        <GlassCard className="p-8">
                            <div className="flex items-center gap-3 mb-8">
                                <Calendar className="text-purple-400" size={24} />
                                <h3 className="text-xl font-bold text-white uppercase tracking-widest">Appointment_Manager</h3>
                            </div>
                            <div className="space-y-4">
                                {appointments.map((appt) => (
                                    <div key={appt.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between group hover:border-purple-500/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex flex-col items-center justify-center border border-purple-500/20">
                                                <span className="text-[10px] text-purple-400 font-mono">{new Date(appt.slot_time).getMonth() + 1}/{new Date(appt.slot_time).getDate()}</span>
                                                <span className="text-sm font-bold text-white">{new Date(appt.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm">Patient_Consultation</h4>
                                                <p className="text-[10px] text-gray-500 font-mono uppercase">Status: {appt.status}</p>
                                            </div>
                                        </div>
                                        <button className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-mono uppercase hover:bg-purple-500 hover:text-white transition-all">View_Details</button>
                                    </div>
                                ))}
                                {appointments.length === 0 && (
                                    <p className="text-xs text-gray-500 font-mono text-center py-4 italic">No appointments scheduled</p>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

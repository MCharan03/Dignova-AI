'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SplitText } from '@/components/ui/SentientMotion';
import { Calendar, Plus, Trash2, Clock, Stethoscope, Filter } from 'lucide-react';
import { apiUrl } from '@/lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBR = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

interface Schedule {
    id: number; doctor_id: number; doctor_name: string;
    organization_id: number; department_id: number | null; department_name: string | null;
    day_of_week: number; start_time: string; end_time: string; is_active: boolean;
}

interface Doctor {
    id: number; name: string; email: string; role: string; specialty?: string;
}

export default function SchedulesPage() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    // Form
    const [formDoctor, setFormDoctor] = useState('');
    const [formDay, setFormDay] = useState(0);
    const [formStart, setFormStart] = useState('09:00');
    const [formEnd, setFormEnd] = useState('17:00');

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchData = useCallback(async () => {
        try {
            const [schedRes, docRes] = await Promise.all([
                fetch(apiUrl('/api/org/schedules'), { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(apiUrl('/api/users?role=doctor'), { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            if (schedRes.ok) setSchedules(await schedRes.json().catch(() => ({})));
            if (docRes.ok) {
                const userData = await docRes.json().catch(() => ({}));
                setDoctors(Array.isArray(userData) ? userData : userData.users || []);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formDoctor) return;
        try {
            await fetch(apiUrl('/api/org/schedules'), {
                method: 'POST', headers: authHeaders,
                body: JSON.stringify({ doctor_id: parseInt(formDoctor), day_of_week: formDay, start_time: formStart, end_time: formEnd })
            });
            setShowAdd(false);
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (schedId: number) => {
        try {
            await fetch(apiUrl(`/api/org/schedules/${schedId}`), { method: 'DELETE', headers: authHeaders });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const filteredSchedules = selectedDay !== null ? schedules.filter(s => s.day_of_week === selectedDay) : schedules;

    // Group by day for weekly view
    const byDay: Record<number, Schedule[]> = {};
    for (let d = 0; d < 7; d++) byDay[d] = [];
    filteredSchedules.forEach(s => { if (byDay[s.day_of_week]) byDay[s.day_of_week].push(s); });

    if (loading) {
        return <div className="flex items-center justify-center h-[60vh]"><div className="w-12 h-12 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" /></div>;
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <SplitText text="SHIFT_SCHEDULER" className="text-2xl font-black text-white tracking-[0.15em]" />
                    <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-[0.2em]">Doctor shift management & availability</p>
                </div>
                <GlassButton onClick={() => setShowAdd(true)} className="gap-2"><Plus size={16} /> Add Shift</GlassButton>
            </div>

            {/* Day Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                    onClick={() => setSelectedDay(null)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap ${selectedDay === null ? 'bg-accent-blue/20 border border-accent-blue/40 text-accent-blue' : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10'}`}
                >All Days</button>
                {DAY_ABBR.map((d, i) => (
                    <button
                        key={d}
                        onClick={() => setSelectedDay(i)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all ${selectedDay === i ? 'bg-accent-blue/20 border border-accent-blue/40 text-accent-blue' : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10'}`}
                    >{d}</button>
                ))}
            </div>

            {/* Add Shift Form */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <GlassCard className="p-8 border-accent-blue/30">
                            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="text-accent-blue" /> Assign New Shift
                            </h2>
                            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Doctor</label>
                                    <select value={formDoctor} onChange={e => setFormDoctor(e.target.value)} required
                                        className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-accent-blue/50">
                                        <option value="">Select doctor...</option>
                                        {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Day</label>
                                    <select value={formDay} onChange={e => setFormDay(parseInt(e.target.value))}
                                        className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-accent-blue/50">
                                        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Start</label>
                                        <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)}
                                            className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-accent-blue/50" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">End</label>
                                        <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)}
                                            className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-accent-blue/50" />
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <GlassButton type="submit" className="flex-1 justify-center bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue border-accent-blue/40 font-bold py-3">
                                        ASSIGN
                                    </GlassButton>
                                    <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-xs hover:bg-white/10 transition-all">✕</button>
                                </div>
                            </form>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Weekly Grid */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {Array.from({ length: 7 }, (_, dayIndex) => (
                    <div key={dayIndex} className={`${selectedDay !== null && selectedDay !== dayIndex ? 'hidden md:block opacity-30' : ''}`}>
                        <GlassCard className="p-4 h-full border-white/5 hover:border-white/10 transition-all">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                                <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${dayIndex < 5 ? 'text-white' : 'text-accent-cyan'}`}>{DAY_ABBR[dayIndex]}</span>
                                <span className="text-[10px] font-mono text-gray-600">{byDay[dayIndex]?.length || 0}</span>
                            </div>
                            <div className="space-y-2 min-h-[100px]">
                                {(byDay[dayIndex] || []).map(sched => (
                                    <motion.div
                                        key={sched.id}
                                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                        className="p-2.5 rounded-lg bg-accent-blue/10 border border-accent-blue/20 group relative"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Stethoscope size={12} className="text-accent-blue" />
                                            <span className="text-[10px] font-bold text-white truncate">{sched.doctor_name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock size={10} className="text-gray-500" />
                                            <span className="text-[9px] font-mono text-gray-400">{sched.start_time} — {sched.end_time}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(sched.id)}
                                            className="absolute top-1.5 right-1.5 p-1 rounded bg-danger/10 text-danger opacity-0 group-hover:opacity-100 hover:bg-danger hover:text-white transition-all"
                                        ><Trash2 size={10} /></button>
                                    </motion.div>
                                ))}
                                {(!byDay[dayIndex] || byDay[dayIndex].length === 0) && (
                                    <div className="py-4 text-center">
                                        <p className="text-[9px] font-mono text-gray-700 uppercase">No shifts</p>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <GlassCard className="p-4 border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Calendar size={18} className="text-accent-cyan" />
                    <span className="text-xs font-mono text-gray-400">
                        <span className="text-white font-bold">{schedules.length}</span> total shifts across <span className="text-white font-bold">{new Set(schedules.map(s => s.doctor_id)).size}</span> doctors
                    </span>
                </div>
            </GlassCard>
        </div>
    );
}

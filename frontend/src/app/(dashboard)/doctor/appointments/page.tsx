'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Calendar, Clock, User, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface Appointment { id: number; slot_time: string; status: string; notes: string; patient: { id: number; name: string; age: number; blood_group: string; email: string } | null; }

const STATUS_STYLE: Record<string, string> = { pending: 'text-amber-400 border-amber-400/40 bg-amber-400/10', confirmed: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10', cancelled: 'text-rose-400 border-rose-400/40 bg-rose-400/10' };

export default function DoctorAppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
    const token = () => localStorage.getItem('access_token') || '';

    const load = () => {
        fetch(apiUrl('/api/appointments/doctor'), { headers: { Authorization: `Bearer ${token()}` } })
            .then(r => r.ok ? r.json().catch(() => ({})) : []).then(setAppointments).finally(() => setLoading(false));
    };
    useEffect(load, []);

    const updateStatus = async (id: number, status: string) => {
        await fetch(apiUrl(`/api/appointments/${id}/status`), {
            method: 'PUT', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    const filtered = appointments.filter(a => filter === 'all' || a.status === filter);
    const groupedByDate: Record<string, Appointment[]> = {};
    filtered.forEach(a => {
        const d = new Date(a.slot_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        if (!groupedByDate[d]) groupedByDate[d] = [];
        groupedByDate[d].push(a);
    });

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase">My Schedule</h1>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-1 flex items-center gap-2"><Calendar size={12} className="text-accent-cyan" /> Upcoming Patient Appointments</p>
                </div>
                <div className="flex gap-2">
                    {(['all', 'pending', 'confirmed'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-[10px] font-mono uppercase transition-all ${filter === f ? 'bg-accent-cyan text-black font-black' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white'}`}>{f}</button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" /></div>
            ) : Object.keys(groupedByDate).length === 0 ? (
                <GlassCard className="p-16 text-center"><Calendar size={48} className="mx-auto mb-4 text-white/20" /><p className="text-white/40 font-mono">No appointments {filter !== 'all' ? `(${filter})` : ''}</p></GlassCard>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedByDate).map(([date, appts]) => (
                        <div key={date}>
                            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={12} /> {date}</p>
                            <div className="space-y-3">
                                {appts.map((a, i) => (
                                    <motion.div key={a.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                        <GlassCard className="border-white/5 overflow-hidden">
                                            <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center shrink-0">
                                                        <Clock size={20} className="text-accent-blue" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-lg">{new Date(a.slot_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                                                        {a.patient && (
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <p className="text-sm text-white/70">{a.patient.name}</p>
                                                                <span className="text-[9px] font-mono text-white/30">{a.patient.age ? `${a.patient.age}y` : ''} {a.patient.blood_group || ''}</span>
                                                            </div>
                                                        )}
                                                        {a.notes && <p className="text-xs text-white/40 italic mt-1">{a.notes}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono border uppercase ${STATUS_STYLE[a.status] || ''}`}>{a.status}</span>
                                                    {a.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => updateStatus(a.id, 'confirmed')} className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all"><Check size={16} /></button>
                                                            <button onClick={() => updateStatus(a.id, 'cancelled')} className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all"><X size={16} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </GlassCard>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Calendar, Clock, Check, X, Plus } from 'lucide-react';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);

interface ScheduleSlot { day: number; start: string; end: string; }

export default function DoctorAvailabilityPage() {
    const [schedule, setSchedule] = useState<Record<number, { start: string; end: string } | null>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<number | null>(null);
    const [editDay, setEditDay] = useState<number | null>(null);
    const [editStart, setEditStart] = useState('09:00');
    const [editEnd, setEditEnd] = useState('17:00');
    const token = () => localStorage.getItem('access_token') || '';

    useEffect(() => {
        fetch('/api/appointments/schedule/me', { headers: { Authorization: `Bearer ${token()}` } })
            .then(r => r.ok ? r.json() : [])
            .then((slots: ScheduleSlot[]) => {
                const map: Record<number, { start: string; end: string } | null> = {};
                for (let i = 0; i < 7; i++) map[i] = null;
                slots.forEach(s => { map[s.day] = { start: s.start, end: s.end }; });
                setSchedule(map);
            }).finally(() => setLoading(false));
    }, []);

    const saveSlot = async (day: number) => {
        setSaving(day);
        await fetch('/api/appointments/schedule/set', {
            method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ day_of_week: day, start_time: editStart, end_time: editEnd })
        });
        setSchedule(s => ({ ...s, [day]: { start: editStart, end: editEnd } }));
        setEditDay(null);
        setSaving(null);
    };

    const removeSlot = async (day: number) => {
        await fetch(`/api/appointments/schedule/${day}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
        setSchedule(s => ({ ...s, [day]: null }));
    };

    const inputCls = "bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-cyan/50";

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div>
                <h1 className="text-3xl font-black text-white tracking-widest uppercase">Availability</h1>
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-1 flex items-center gap-2"><Calendar size={12} className="text-accent-cyan" /> Set Your Weekly Schedule</p>
            </div>

            <GlassCard className="p-6">
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-6">Weekly Availability Grid</p>
                {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" /></div> : (
                    <div className="space-y-3">
                        {DAYS.map((day, i) => {
                            const slot = schedule[i];
                            const isEditing = editDay === i;
                            return (
                                <div key={i} className={`flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-2xl border transition-all ${slot ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-black/20 border-white/5'}`}>
                                    <div className="w-28 shrink-0">
                                        <p className={`font-bold text-sm ${slot ? 'text-emerald-400' : 'text-white/40'}`}>{day}</p>
                                        {slot && <p className="text-[9px] font-mono text-white/30">{slot.start} – {slot.end}</p>}
                                    </div>

                                    {isEditing ? (
                                        <div className="flex items-center gap-3 flex-1 flex-wrap">
                                            <select value={editStart} onChange={e => setEditStart(e.target.value)} className={inputCls}>
                                                {HOURS.map(h => <option key={h}>{h}</option>)}
                                            </select>
                                            <span className="text-white/40 font-mono text-sm">to</span>
                                            <select value={editEnd} onChange={e => setEditEnd(e.target.value)} className={inputCls}>
                                                {HOURS.map(h => <option key={h}>{h}</option>)}
                                            </select>
                                            <button onClick={() => saveSlot(i)} disabled={saving === i} className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-2">
                                                <Check size={14} /> {saving === i ? 'Saving...' : 'Save'}
                                            </button>
                                            <button onClick={() => setEditDay(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm hover:text-white transition-all"><X size={14} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 flex-1">
                                            {slot ? (
                                                <>
                                                    <div className="flex-1 h-8 bg-black/30 rounded-xl relative overflow-hidden border border-white/5">
                                                        {(() => {
                                                            const [sh] = slot.start.split(':').map(Number);
                                                            const [eh] = slot.end.split(':').map(Number);
                                                            const pct = ((sh / 24) * 100);
                                                            const width = ((eh - sh) / 24) * 100;
                                                            return <motion.div className="absolute top-0 bottom-0 bg-emerald-500/30 rounded-lg" style={{ left: `${pct}%`, width: `${width}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} />;
                                                        })()}
                                                        <div className="absolute inset-0 flex items-center px-3">
                                                            <span className="text-[9px] font-mono text-white/30">{slot.start} – {slot.end}</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => { setEditDay(i); setEditStart(slot.start); setEditEnd(slot.end); }} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-mono hover:text-white transition-all">Edit</button>
                                                    <button onClick={() => removeSlot(i)} className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-mono hover:bg-rose-500/20 transition-all"><X size={12} /></button>
                                                </>
                                            ) : (
                                                <button onClick={() => { setEditDay(i); setEditStart('09:00'); setEditEnd('17:00'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-dashed border-white/10 text-white/30 hover:text-white hover:border-accent-cyan/30 transition-all text-sm">
                                                    <Plus size={14} /> Add Hours
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </GlassCard>
        </div>
    );
}

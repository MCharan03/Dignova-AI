'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { History, Filter, ChevronDown, User, Shield, Stethoscope, AlertTriangle, Calendar, Activity } from 'lucide-react';

interface AuditEvent {
    id: number;
    user_id: number | null;
    organization_id: number | null;
    action: string;
    target_type: string | null;
    target_id: number | null;
    details: any;
    ip_address: string | null;
    created_at: string;
}

const ACTION_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    'user.create':        { icon: <User size={14} />,         color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',  label: 'User Created' },
    'user.login':         { icon: <Shield size={14} />,        color: 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30',  label: 'Login' },
    'prescription.create':{ icon: <Stethoscope size={14} />,   color: 'text-accent-purple bg-accent-purple/10 border-accent-purple/30', label: 'Prescription' },
    'appointment.book':   { icon: <Calendar size={14} />,      color: 'text-accent-blue bg-accent-blue/10 border-accent-blue/30',  label: 'Appointment' },
    'sos.triggered':      { icon: <AlertTriangle size={14} />, color: 'text-rose-400 bg-rose-400/10 border-rose-400/30',           label: 'SOS Alert' },
    'alert.vitals_flag':  { icon: <Activity size={14} />,      color: 'text-amber-400 bg-amber-400/10 border-amber-400/30',        label: 'Vitals Alert' },
};

function getActionMeta(action: string) {
    return ACTION_META[action] || { icon: <History size={14} />, color: 'text-white/40 bg-white/5 border-white/10', label: action };
}

export default function AdminAuditPage() {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [filter, setFilter] = useState('all');
    const token = () => localStorage.getItem('access_token') || '';

    useEffect(() => {
        fetch('/api/admin/audit-log', { headers: { Authorization: `Bearer ${token()}` } })
            .then(r => r.ok ? r.json() : [])
            .then(setEvents)
            .finally(() => setLoading(false));
    }, []);

    const actionTypes = ['all', ...Array.from(new Set(events.map(e => e.action)))];
    const filtered = filter === 'all' ? events : events.filter(e => e.action === filter);

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase">Audit Timeline</h1>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-1 flex items-center gap-2"><History size={12} className="text-accent-cyan" /> Immutable System Event Log</p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-white/40" />
                    <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-[10px] font-mono uppercase focus:outline-none focus:border-accent-cyan/50">
                        {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" /></div>
            ) : filtered.length === 0 ? (
                <GlassCard className="p-16 text-center"><History size={48} className="mx-auto mb-4 text-white/20" /><p className="text-white/40 font-mono">No audit events found</p></GlassCard>
            ) : (
                <div className="relative">
                    {/* Vertical timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-accent-cyan/40 via-white/10 to-transparent" />
                    <div className="space-y-4 pl-16">
                        {filtered.map((event, i) => {
                            const meta = getActionMeta(event.action);
                            const isExpanded = expandedId === event.id;
                            return (
                                <motion.div key={event.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.04, 0.5) }} className="relative">
                                    {/* Timeline dot */}
                                    <div className={`absolute -left-10 top-4 w-8 h-8 rounded-full border flex items-center justify-center ${meta.color}`}>
                                        {meta.icon}
                                    </div>
                                    <GlassCard className="border-white/5 overflow-hidden hover:border-white/10 transition-all">
                                        <div className="p-5 flex items-start justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : event.id)}>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                                                    {event.target_type && <span className="text-[9px] font-mono text-white/20">{event.target_type} #{event.target_id}</span>}
                                                </div>
                                                <p className="text-sm font-mono text-white/60">{event.action}</p>
                                                <div className="flex items-center gap-4 mt-1">
                                                    {event.user_id && <span className="text-[9px] font-mono text-white/30">User #{event.user_id}</span>}
                                                    {event.ip_address && <span className="text-[9px] font-mono text-white/20">{event.ip_address}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-[9px] font-mono text-white/30">{new Date(event.created_at).toLocaleString()}</span>
                                                <ChevronDown size={14} className={`text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                            {isExpanded && event.details && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5 overflow-hidden">
                                                    <div className="p-5">
                                                        <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Event Details</p>
                                                        <pre className="text-[10px] font-mono text-white/50 bg-black/40 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap border border-white/5">
                                                            {JSON.stringify(event.details, null, 2)}
                                                        </pre>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </GlassCard>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

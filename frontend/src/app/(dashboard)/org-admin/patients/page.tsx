'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';
import { Users, Search, Activity, HeartPulse, Droplets, Clock, ChevronRight, Filter, AlertTriangle } from 'lucide-react';

interface Patient {
    id: number; name: string; email: string;
    phone_number: string | null; age: number | null;
    blood_group: string | null; chronic_conditions: string | null;
    last_visit: string | null; total_calls: number;
    status: string; is_verified: boolean; created_at: string | null;
}

export default function PatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

    const fetchPatients = useCallback(async () => {
        try {
            const res = await fetch('/api/org/patients', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setPatients(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchPatients(); }, [fetchPatients]);

    const filtered = patients.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const statusColor = (status: string) => {
        switch (status) {
            case 'in_triage': return { bg: 'bg-danger/20', text: 'text-danger', border: 'border-danger/30', dot: 'bg-danger animate-pulse' };
            case 'critical': return { bg: 'bg-danger/20', text: 'text-danger', border: 'border-danger/30', dot: 'bg-danger animate-pulse' };
            default: return { bg: 'bg-success/20', text: 'text-success', border: 'border-success/30', dot: 'bg-success' };
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-[60vh]"><div className="w-12 h-12 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" /></div>;
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                <div>
                    <SplitText text="PATIENT_REGISTRY" className="text-2xl font-black text-white tracking-[0.15em]" />
                    <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-[0.2em]">{patients.length} registered patients in your organization</p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
                <GlassCard className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20"><Users size={20} className="text-accent-cyan" /></div>
                    <div><p className="text-xl font-black text-white">{patients.length}</p><p className="text-[9px] font-mono text-gray-500 uppercase">Total</p></div>
                </GlassCard>
                <GlassCard className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-danger/10 border border-danger/20"><Activity size={20} className="text-danger" /></div>
                    <div><p className="text-xl font-black text-danger">{patients.filter(p => p.status === 'in_triage').length}</p><p className="text-[9px] font-mono text-gray-500 uppercase">In Triage</p></div>
                </GlassCard>
                <GlassCard className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-success/10 border border-success/20"><HeartPulse size={20} className="text-success" /></div>
                    <div><p className="text-xl font-black text-success">{patients.filter(p => p.status === 'nominal').length}</p><p className="text-[9px] font-mono text-gray-500 uppercase">Nominal</p></div>
                </GlassCard>
                <GlassCard className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-warning/10 border border-warning/20"><AlertTriangle size={20} className="text-warning" /></div>
                    <div><p className="text-xl font-black text-warning">{patients.filter(p => p.chronic_conditions).length}</p><p className="text-[9px] font-mono text-gray-500 uppercase">Chronic</p></div>
                </GlassCard>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search patients by name or email..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-accent-cyan/40 transition-all font-mono"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'nominal', 'in_triage'].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-4 py-3 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all ${statusFilter === s ? 'bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan' : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10'}`}>
                            {s === 'all' ? 'All' : s === 'in_triage' ? 'In Triage' : 'Nominal'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Patient Table */}
            <GlassCard className="overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Patient', 'Age', 'Blood', 'Conditions', 'Visits', 'Status', 'Last Visit'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((patient, i) => {
                                const sc = statusColor(patient.status);
                                return (
                                    <motion.tr
                                        key={patient.id}
                                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                        className="border-b border-white/5 hover:bg-white/[0.02] transition-all group cursor-pointer"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan text-[10px] font-black">
                                                    {patient.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{patient.name}</p>
                                                    <p className="text-[10px] font-mono text-gray-500">{patient.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-400">{patient.age || '—'}</td>
                                        <td className="px-4 py-3">
                                            {patient.blood_group ? (
                                                <span className="flex items-center gap-1 text-sm text-danger font-bold">
                                                    <Droplets size={12} /> {patient.blood_group}
                                                </span>
                                            ) : <span className="text-gray-600">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-[11px] text-gray-400 max-w-[200px] truncate">{patient.chronic_conditions || '—'}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-white">{patient.total_calls}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${sc.bg} ${sc.text} border ${sc.border}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                {patient.status === 'in_triage' ? 'TRIAGE' : 'NOMINAL'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {patient.last_visit ? (
                                                <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500">
                                                    <Clock size={10} /> {new Date(patient.last_visit).toLocaleDateString()}
                                                </span>
                                            ) : <span className="text-[10px] font-mono text-gray-700">Never</span>}
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-16 text-center">
                        <Users size={40} className="text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">No patients found.</p>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}

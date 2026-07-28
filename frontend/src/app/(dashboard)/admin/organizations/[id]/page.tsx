'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';
import { apiUrl } from '@/lib/api';
import { 
    Building2, ArrowLeft, Users, Stethoscope, Activity, Shield, 
    TrendingUp, AlertTriangle, ChevronRight, Clock, Mail, 
    Pause, Play, Trash2, Settings, BarChart3
} from 'lucide-react';

interface OrgStats {
    organization: {
        id: number; name: string; org_code: string;
        subscription_tier: string; ai_philosophy: string;
        is_active: boolean; primary_color: string; accent_color: string;
        created_at: string;
    };
    staff: {
        total: number; doctors: number; doctors_online: number;
        patients: number; admins: number;
    };
    calls: {
        total: number; active: number; completed: number;
        critical: number; diagnosed: number; accuracy: number;
        call_volume: { date: string; count: number }[];
    };
    departments: number;
    capacity: { max_beds: number; max_doctors: number };
}

interface OrgMember {
    id: number; name: string; email: string; role: string;
    tier?: string; specialty?: string; is_online: boolean;
    is_verified: boolean; created_at: string;
}

type Tab = 'overview' | 'members' | 'calls';

export default function OrgDrilldownPage() {
    const params = useParams();
    const router = useRouter();
    const orgId = params.id as string;

    const [stats, setStats] = useState<OrgStats | null>(null);
    const [members, setMembers] = useState<OrgMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, membersRes] = await Promise.all([
                fetch(apiUrl(`/api/organizations/${orgId}/stats`), { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(apiUrl(`/api/organizations/${orgId}/members`), { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            if (statsRes.ok) setStats(await statsRes.json().catch(() => ({})));
            if (membersRes.ok) setMembers(await membersRes.json().catch(() => ({})));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [orgId, token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleToggleSuspend = async () => {
        try {
            await fetch(apiUrl(`/api/organizations/${orgId}/suspend`), { method: 'PATCH', headers: authHeaders });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async () => {
        if (!confirm('PERMANENTLY DELETE this organization? This cannot be undone.')) return;
        try {
            await fetch(apiUrl(`/api/organizations/${orgId}`), { method: 'DELETE', headers: authHeaders });
            router.push('/admin/organizations');
        } catch (err) { console.error(err); }
    };

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
            </div>
        );
    }

    const { organization: org, staff, calls, departments, capacity } = stats;
    const maxCallDay = calls.call_volume.reduce((max, d) => d.count > max ? d.count : max, 1);

    const tabs = [
        { key: 'overview', label: 'Overview', icon: BarChart3 },
        { key: 'members', label: `Members (${members.length})`, icon: Users },
        { key: 'calls', label: 'Call Volume', icon: Activity },
    ] as const;

    const roleBadge = (role: string) => {
        const map: Record<string, string> = {
            doctor: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
            org_admin: 'bg-accent-purple/20 text-accent-purple border-accent-purple/30',
            super_admin: 'bg-danger/20 text-danger border-danger/30',
            user: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
        };
        return map[role] || 'bg-white/10 text-gray-400 border-white/10';
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Back + Header */}
            <div className="flex items-center gap-4 mb-2">
                <button onClick={() => router.push('/admin/organizations')} className="p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                    <ArrowLeft size={18} className="text-gray-400" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <SplitText text={org.name.toUpperCase()} className="text-2xl font-black text-white tracking-[0.12em]" />
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${org.is_active ? 'bg-success/20 text-success border border-success/30' : 'bg-danger/20 text-danger border border-danger/30'}`}>
                            {org.is_active ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                    </div>
                    <p className="text-[10px] font-mono text-gray-500 mt-0.5 uppercase tracking-[0.2em]">{org.org_code} · {org.subscription_tier} · AI: {org.ai_philosophy}</p>
                </div>
                <div className="flex gap-2">
                    <GlassButton onClick={handleToggleSuspend} className={`gap-2 !text-xs ${org.is_active ? '!text-warning' : '!text-success'}`}>
                        {org.is_active ? <><Pause size={14} /> Suspend</> : <><Play size={14} /> Activate</>}
                    </GlassButton>
                    <button onClick={handleDelete} className="p-3 rounded-lg bg-danger/10 border border-danger/20 hover:bg-danger text-danger hover:text-white transition-all">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                    { label: 'Doctors', value: staff.doctors, color: 'text-accent-blue' },
                    { label: 'Online', value: staff.doctors_online, color: 'text-success' },
                    { label: 'Patients', value: staff.patients, color: 'text-accent-cyan' },
                    { label: 'Admins', value: staff.admins, color: 'text-accent-purple' },
                    { label: 'Departments', value: departments, color: 'text-white' },
                    { label: 'Total Calls', value: calls.total, color: 'text-white' },
                    { label: 'Active', value: calls.active, color: 'text-warning' },
                    { label: 'Critical', value: calls.critical, color: 'text-danger' },
                ].map((kpi, i) => (
                    <GlassCard key={i} className="p-3 text-center border-white/5">
                        <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
                        <p className="text-[8px] font-mono text-gray-500 uppercase tracking-wider mt-0.5">{kpi.label}</p>
                    </GlassCard>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/5 pb-0">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-3 text-[10px] font-mono uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === tab.key ? 'border-accent-blue text-accent-blue' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Accuracy */}
                    <GlassCard className="p-6 border-white/5">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <TrendingUp className="text-success" size={18} /> Diagnostic Accuracy
                        </h3>
                        <div className="flex items-end gap-4">
                            <span className="text-5xl font-black text-white">{calls.accuracy}%</span>
                            <span className="text-[10px] font-mono text-gray-500 pb-2">{calls.diagnosed} / {calls.total} calls diagnosed</span>
                        </div>
                        <div className="mt-4 w-full bg-white/5 rounded-full h-2 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${calls.accuracy}%` }} transition={{ duration: 1.5, ease: 'easeOut' }}
                                className="h-full rounded-full bg-gradient-to-r from-accent-blue to-success" />
                        </div>
                    </GlassCard>

                    {/* Capacity */}
                    <GlassCard className="p-6 border-white/5">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Shield className="text-accent-purple" size={18} /> Capacity Limits
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                                    <span>Doctors ({staff.doctors} / {capacity.max_doctors})</span>
                                    <span>{Math.round((staff.doctors / capacity.max_doctors) * 100)}%</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                    <div className="h-full rounded-full bg-accent-blue" style={{ width: `${(staff.doctors / capacity.max_doctors) * 100}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                                    <span>Bed Load ({calls.critical} / {capacity.max_beds})</span>
                                    <span>{Math.round((calls.critical / capacity.max_beds) * 100)}%</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                    <div className="h-full rounded-full bg-accent-cyan" style={{ width: `${(calls.critical / capacity.max_beds) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            )}

            {activeTab === 'members' && (
                <GlassCard className="overflow-hidden border-white/5">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                {['Name', 'Email', 'Role', 'Specialty', 'Status', 'Joined'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((m, i) => (
                                <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                    className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                                    <td className="px-4 py-3 text-sm font-bold text-white">{m.name}</td>
                                    <td className="px-4 py-3 text-[11px] font-mono text-gray-400">{m.email}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${roleBadge(m.role)}`}>
                                            {m.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[11px] text-gray-400">{m.specialty || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 text-[9px] font-mono ${m.is_online ? 'text-success' : 'text-gray-600'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${m.is_online ? 'bg-success' : 'bg-gray-600'}`} />
                                            {m.is_online ? 'Online' : 'Offline'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-[10px] font-mono text-gray-500">
                                        {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </GlassCard>
            )}

            {activeTab === 'calls' && (
                <GlassCard className="p-6 border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">14-Day Call Volume</h3>
                    <div className="flex items-end gap-1.5 h-48">
                        {calls.call_volume.map((day, i) => (
                            <motion.div
                                key={day.date}
                                initial={{ height: 0 }} animate={{ height: `${(day.count / maxCallDay) * 100}%` }}
                                transition={{ duration: 0.5, delay: i * 0.03 }}
                                className="flex-1 rounded-t-md bg-gradient-to-t from-accent-blue/40 to-accent-blue/80 relative group min-h-[2px]"
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/90 border border-white/10 text-[9px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {day.count} calls
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2">
                        <span className="text-[8px] font-mono text-gray-600">{calls.call_volume[0]?.date}</span>
                        <span className="text-[8px] font-mono text-gray-600">{calls.call_volume[calls.call_volume.length - 1]?.date}</span>
                    </div>
                </GlassCard>
            )}
        </div>
    );
}

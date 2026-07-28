'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { SplitText } from '@/components/ui/SentientMotion';
import { Stethoscope, Users, Search, Shield, UserCheck, UserX, Mail, Clock } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface StaffMember {
    id: number; name: string; email: string; role: string;
    specialty?: string; is_online: boolean; tier?: string;
    is_verified: boolean; created_at: string | null;
}

export default function StaffPage() {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

    const fetchStaff = useCallback(async () => {
        try {
            const res = await fetch(apiUrl('/api/users'), { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                const users = Array.isArray(data) ? data : data.users || [];
                // Filter to only show staff (doctors, org_admins) — not patients
                setStaff(users.filter((u: StaffMember) => u.role !== 'user'));
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    const filtered = staff.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'all' || s.role === roleFilter;
        return matchSearch && matchRole;
    });

    const roleIcon = (role: string) => {
        switch (role) {
            case 'doctor': return <Stethoscope size={14} className="text-accent-blue" />;
            case 'org_admin': return <Shield size={14} className="text-accent-purple" />;
            case 'super_admin': return <Shield size={14} className="text-danger" />;
            default: return <Users size={14} className="text-gray-400" />;
        }
    };

    const roleBadge = (role: string) => {
        const map: Record<string, string> = {
            doctor: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
            org_admin: 'bg-accent-purple/20 text-accent-purple border-accent-purple/30',
            super_admin: 'bg-danger/20 text-danger border-danger/30',
        };
        return map[role] || 'bg-white/10 text-gray-400 border-white/10';
    };

    if (loading) {
        return <div className="flex items-center justify-center h-[60vh]"><div className="w-12 h-12 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" /></div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <SplitText text="STAFF_DIRECTORY" className="text-2xl font-black text-white tracking-[0.15em]" />
                <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-[0.2em]">{staff.length} staff members in your organization</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <GlassCard className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-accent-blue/10"><Stethoscope size={18} className="text-accent-blue" /></div>
                    <div><p className="text-xl font-black text-white">{staff.filter(s => s.role === 'doctor').length}</p><p className="text-[8px] font-mono text-gray-500 uppercase">Doctors</p></div>
                </GlassCard>
                <GlassCard className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-accent-purple/10"><Shield size={18} className="text-accent-purple" /></div>
                    <div><p className="text-xl font-black text-white">{staff.filter(s => s.role === 'org_admin').length}</p><p className="text-[8px] font-mono text-gray-500 uppercase">Admins</p></div>
                </GlassCard>
                <GlassCard className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-success/10"><UserCheck size={18} className="text-success" /></div>
                    <div><p className="text-xl font-black text-success">{staff.filter(s => s.is_online).length}</p><p className="text-[8px] font-mono text-gray-500 uppercase">Online</p></div>
                </GlassCard>
                <GlassCard className="p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-warning/10"><UserX size={18} className="text-warning" /></div>
                    <div><p className="text-xl font-black text-warning">{staff.filter(s => !s.is_verified).length}</p><p className="text-[8px] font-mono text-gray-500 uppercase">Unverified</p></div>
                </GlassCard>
            </div>

            {/* Search + Filter */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-accent-blue/40 transition-all font-mono" />
                </div>
                {['all', 'doctor', 'org_admin'].map(r => (
                    <button key={r} onClick={() => setRoleFilter(r)}
                        className={`px-4 py-3 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all ${roleFilter === r ? 'bg-accent-blue/20 border border-accent-blue/40 text-accent-blue' : 'bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10'}`}>
                        {r === 'all' ? 'All' : r === 'org_admin' ? 'Admins' : 'Doctors'}
                    </button>
                ))}
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((member, i) => (
                    <motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <GlassCard className="p-5 hover:border-white/15 transition-all group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue text-sm font-black relative">
                                        {member.name.charAt(0)}
                                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${member.is_online ? 'bg-success' : 'bg-gray-600'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{member.name}</p>
                                        <div className="flex items-center gap-1 text-[10px] font-mono text-gray-500"><Mail size={10} /> {member.email}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${roleBadge(member.role)}`}>
                                    {roleIcon(member.role)} {member.role.replace('_', ' ')}
                                </span>
                                {member.specialty && (
                                    <span className="px-2 py-0.5 rounded-full text-[8px] font-mono text-gray-400 bg-white/5 border border-white/5">{member.specialty}</span>
                                )}
                            </div>
                            {member.created_at && (
                                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/5 text-[9px] font-mono text-gray-600">
                                    <Clock size={10} /> Joined {new Date(member.created_at).toLocaleDateString()}
                                </div>
                            )}
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="py-16 text-center">
                    <Users size={40} className="text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No staff members found.</p>
                </div>
            )}
        </div>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { CheckCircle, Trash2, Users, AlertTriangle, X, Search, Stethoscope, UserCircle, Building2, ShieldCheck, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    is_verified: boolean;
    organization_id?: number | null;
    organization_name?: string | null;
    specialty?: string | null;
    tier?: string | null;
    is_online?: boolean;
    created_at?: string | null;
}

type TabKey = 'all' | 'patients' | 'doctors' | 'admins' | 'pending';

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [orgs, setOrgs] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [search, setSearch] = useState('');
    const [filterOrg, setFilterOrg] = useState<number | 'all'>('all');
    const router = useRouter();

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const [usersRes, orgsRes] = await Promise.all([
                fetch('/api/auth/users', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/organizations', { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            if (usersRes.ok) setUsers(await usersRes.json());
            if (orgsRes.ok) setOrgs(await orgsRes.json());
        } catch (err: unknown) {
            if (err instanceof Error) setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) { router.push('/login'); return; }
        fetchData();
    }, [router]);

    const approveUser = async (userId: number) => {
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`/api/auth/approve/${userId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) fetchData();
        } catch {}
    };

    const deleteUser = async (userId: number) => {
        setDeleting(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/auth/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok || res.status === 204) { setDeleteTarget(null); fetchData(); }
            else { const err = await res.json().catch(() => ({ detail: 'Error' })); alert(err.detail); }
        } catch (err: unknown) { if (err instanceof Error) alert(err.message); }
        finally { setDeleting(false); }
    };

    const changeRole = async (userId: number, newRole: string) => {
        const token = localStorage.getItem('access_token');
        try {
            await fetch(`/api/auth/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            fetchData();
        } catch {}
    };

    // Categorize users
    const pendingUsers = users.filter(u => !u.is_verified);
    const activeUsers = users.filter(u => u.is_verified);
    const doctors = activeUsers.filter(u => u.role === 'doctor');
    const patients = activeUsers.filter(u => u.role === 'user');
    const admins = activeUsers.filter(u => u.role === 'super_admin' || u.role === 'org_admin');

    const tabConfig: { key: TabKey; label: string; count: number; icon: any; color: string }[] = [
        { key: 'all', label: 'All Users', count: activeUsers.length, icon: Users, color: 'text-white' },
        { key: 'patients', label: 'Patients', count: patients.length, icon: UserCircle, color: 'text-accent-cyan' },
        { key: 'doctors', label: 'Doctors', count: doctors.length, icon: Stethoscope, color: 'text-accent-blue' },
        { key: 'admins', label: 'Admins', count: admins.length, icon: ShieldCheck, color: 'text-accent-purple' },
        { key: 'pending', label: 'Pending', count: pendingUsers.length, icon: AlertTriangle, color: 'text-warning' },
    ];

    // Get filtered list based on active tab
    const getFilteredUsers = (): User[] => {
        let list: User[] = [];
        switch (activeTab) {
            case 'patients': list = patients; break;
            case 'doctors': list = doctors; break;
            case 'admins': list = admins; break;
            case 'pending': list = pendingUsers; break;
            default: list = activeUsers;
        }
        if (search) list = list.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
        if (filterOrg !== 'all') list = list.filter(u => u.organization_id === filterOrg);
        return list;
    };

    const filteredUsers = getFilteredUsers();

    // Group by organization
    const groupByOrg = (users: User[]): { orgName: string; orgId: number | null; users: User[] }[] => {
        const groups: Record<string, { orgName: string; orgId: number | null; users: User[] }> = {};
        users.forEach(u => {
            const orgKey = u.organization_id ? String(u.organization_id) : 'independent';
            if (!groups[orgKey]) {
                const orgMatch = orgs.find(o => o.id === u.organization_id);
                groups[orgKey] = {
                    orgName: orgMatch?.name || (u.organization_name as string) || 'Independent (No Organization)',
                    orgId: u.organization_id || null,
                    users: []
                };
            }
            groups[orgKey].users.push(u);
        });
        // Sort: org-linked first, then independent
        return Object.values(groups).sort((a, b) => {
            if (a.orgId && !b.orgId) return -1;
            if (!a.orgId && b.orgId) return 1;
            return a.orgName.localeCompare(b.orgName);
        });
    };

    const roleColor = (role: string) => {
        switch (role) {
            case 'doctor': return 'text-accent-blue bg-accent-blue/10 border-accent-blue/30';
            case 'org_admin': return 'text-accent-purple bg-accent-purple/10 border-accent-purple/30';
            case 'super_admin': return 'text-danger bg-danger/10 border-danger/30';
            default: return 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30';
        }
    };

    const tierBadge = (tier: string | null | undefined) => {
        if (!tier) return null;
        const colors: Record<string, string> = {
            'intern': 'text-warning bg-warning/10 border-warning/30',
            'mid_range': 'text-accent-blue bg-accent-blue/10 border-accent-blue/30',
            'experienced': 'text-success bg-success/10 border-success/30',
        };
        return <span className={`px-1.5 py-0.5 text-[7px] font-black uppercase rounded border ${colors[tier] || 'text-gray-400 bg-gray-400/10 border-gray-400/30'}`}>{tier.replace('_', ' ')}</span>;
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
            <div className="w-10 h-10 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" />
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Loading_User_Matrix</span>
        </div>
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-[0.12em]">User_Matrix</h2>
                    <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-[0.2em]">Platform-wide identity management — {users.length} total accounts</p>
                </div>
            </div>
            {errorMsg && <div className="text-danger mb-4">{errorMsg}</div>}

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {tabConfig.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`p-4 rounded-xl border transition-all text-left ${activeTab === tab.key ? 'bg-white/[0.06] border-white/20 shadow-lg' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <tab.icon size={16} className={tab.color} />
                            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">{tab.label}</span>
                        </div>
                        <span className={`text-2xl font-black ${tab.color}`}>{tab.count}</span>
                        {tab.key === 'pending' && tab.count > 0 && (
                            <span className="ml-2 w-2 h-2 rounded-full bg-warning animate-pulse inline-block" />
                        )}
                    </button>
                ))}
            </div>

            {/* Search & Filter */}
            <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
                        className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-accent-cyan/30 transition-all font-mono" />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-500" />
                    <select value={filterOrg === 'all' ? 'all' : String(filterOrg)} onChange={e => setFilterOrg(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent-cyan/30 transition-all font-mono">
                        <option value="all" className="bg-[#111]">All Organizations</option>
                        {orgs.map(o => <option key={o.id} value={o.id} className="bg-[#111]">{o.name}</option>)}
                        <option value="0" className="bg-[#111]">Independent (No Org)</option>
                    </select>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        onClick={() => !deleting && setDeleteTarget(null)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0d1117] border border-danger/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center"><AlertTriangle className="text-danger" size={20} /></div>
                                <h3 className="text-lg font-bold text-white">Confirm Deletion</h3>
                                <button onClick={() => setDeleteTarget(null)} className="ml-auto text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
                            </div>
                            <p className="text-sm text-gray-300 mb-2">You are about to permanently delete:</p>
                            <div className="bg-black/40 rounded-lg p-3 border border-white/5 mb-4">
                                <p className="font-bold text-white">{deleteTarget.name}</p>
                                <p className="text-xs text-gray-400 font-mono">{deleteTarget.email} • {deleteTarget.role}</p>
                            </div>
                            <p className="text-xs text-gray-500 mb-6">This will also remove all associated calls, vitals, bookings, and training reports. This action cannot be undone.</p>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                                    className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 text-sm font-bold hover:bg-white/10 transition-colors border border-white/10">Cancel</button>
                                <button onClick={() => deleteUser(deleteTarget.id)} disabled={deleting}
                                    className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-bold hover:bg-danger/80 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center gap-2">
                                    {deleting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting...</> : <><Trash2 size={14} />Delete Permanently</>}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pending Approvals (shown in pending tab) */}
            {activeTab === 'pending' && (
                <GlassCard className="border-warning/20">
                    <div className="p-4 border-b border-white/5">
                        <h3 className="text-sm font-bold text-warning uppercase tracking-widest flex items-center gap-2">
                            <AlertTriangle size={16} /> Pending Approvals — {pendingUsers.length}
                        </h3>
                    </div>
                    {filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No pending approvals.</div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredUsers.map((user, i) => (
                                <motion.div key={user.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                    className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-all">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warning/20 to-accent-cyan/20 flex items-center justify-center border border-white/10 text-white font-bold text-sm">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-white">{user.name}</p>
                                        <p className="text-[10px] font-mono text-gray-500">{user.email}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${roleColor(user.role)}`}>{user.role}</span>
                                    <div className="flex gap-2">
                                        <GlassButton variant="primary" onClick={() => approveUser(user.id)} className="py-1 px-3 text-xs" style={{ padding: '0.25rem 0.75rem', minWidth: 'auto' }}>Approve</GlassButton>
                                        <button onClick={() => setDeleteTarget(user)} className="text-gray-400 hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-danger/10"><Trash2 size={16} /></button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </GlassCard>
            )}

            {/* User Table — grouped by organization */}
            {activeTab !== 'pending' && (
                <div className="space-y-6">
                    {filteredUsers.length === 0 ? (
                        <GlassCard className="p-12 text-center border-white/5">
                            <Users size={40} className="text-gray-700 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">No users match current filters.</p>
                        </GlassCard>
                    ) : (
                        groupByOrg(filteredUsers).map((group, gi) => (
                            <motion.div key={group.orgName} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }}>
                                <GlassCard className="overflow-hidden border-white/5">
                                    {/* Org Header */}
                                    <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                                        <Building2 size={14} className={group.orgId ? 'text-accent-blue' : 'text-gray-600'} />
                                        <span className="text-xs font-bold text-white uppercase tracking-widest">{group.orgName}</span>
                                        <span className="text-[9px] font-mono text-gray-500 ml-auto">{group.users.length} member{group.users.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    {/* Table */}
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/5">
                                                {['User', 'Email', 'Role', 'Details', 'Actions'].map(h => (
                                                    <th key={h} className="px-5 py-3 text-left text-[9px] font-mono text-gray-500 uppercase tracking-[0.15em]">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.users.map((user, i) => (
                                                <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                                    className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 flex items-center justify-center border border-white/10 text-white text-xs font-bold">
                                                                    {user.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                {user.is_online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-[#0a0a0f]" />}
                                                            </div>
                                                            <span className="text-sm font-bold text-white">{user.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-[10px] font-mono text-gray-400">{user.email}</td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${roleColor(user.role)}`}>
                                                                {user.role === 'org_admin' ? 'Org Admin' : user.role === 'super_admin' ? 'Super Admin' : user.role}
                                                            </span>
                                                            {user.role === 'doctor' && tierBadge(user.tier)}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        {user.role === 'doctor' && user.specialty && (
                                                            <span className="text-[10px] font-mono text-gray-400">{user.specialty}</span>
                                                        )}
                                                        {user.role === 'user' && (
                                                            <span className="text-[10px] font-mono text-gray-500">Patient</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <select value={user.role} onChange={e => changeRole(user.id, e.target.value)}
                                                                className="bg-transparent border border-white/10 text-white text-xs rounded-lg px-2 py-1 outline-none focus:border-accent-cyan/30 transition-all">
                                                                <option value="user" className="bg-[#111]">User</option>
                                                                <option value="doctor" className="bg-[#111]">Doctor</option>
                                                                <option value="org_admin" className="bg-[#111]">Org Admin</option>
                                                            </select>
                                                            <button onClick={() => setDeleteTarget(user)} className="text-gray-500 hover:text-danger transition-colors p-1 rounded-lg hover:bg-danger/10" title="Delete">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </GlassCard>
                            </motion.div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

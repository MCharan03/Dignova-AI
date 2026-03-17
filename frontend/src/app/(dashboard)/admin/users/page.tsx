'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { CheckCircle, Trash2, Users, AlertTriangle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    is_verified: boolean;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch('/api/auth/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data);
        } catch (err: unknown) {
            if (err instanceof Error) setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchUsers();
    }, [router]);

    const approveUser = async (userId: number) => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/auth/approve/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to approve user');
            fetchUsers();
        } catch (err: unknown) {
            if (err instanceof Error) alert(err.message);
        }
    };

    const deleteUser = async (userId: number) => {
        setDeleting(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/auth/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok || res.status === 204) {
                setDeleteTarget(null);
                fetchUsers();
            } else {
                const errData = await res.json().catch(() => ({ detail: 'Unknown error' }));
                alert(`Failed: ${errData.detail || res.statusText}`);
            }
        } catch (err: unknown) {
            if (err instanceof Error) alert(err.message);
        } finally {
            setDeleting(false);
        }
    };

    const changeRole = async (userId: number, newRole: string) => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/auth/users/${userId}/role`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });
            if (!res.ok) throw new Error('Failed to change role');
            fetchUsers();
        } catch (err: unknown) {
            if (err instanceof Error) alert(err.message);
        }
    };

    const pendingUsers = users.filter(u => !u.is_verified);
    const activeUsers = users.filter(u => u.is_verified);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
            <div className="w-10 h-10 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" />
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Loading_User_Matrix</span>
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">User Management</h2>
            {errorMsg && <div className="text-danger mb-4">{errorMsg}</div>}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        onClick={() => !deleting && setDeleteTarget(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0d1117] border border-danger/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-[0_0_40px_rgba(239,68,68,0.15)]"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center">
                                    <AlertTriangle className="text-danger" size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-white">Confirm Deletion</h3>
                                <button onClick={() => setDeleteTarget(null)} className="ml-auto text-gray-500 hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <p className="text-sm text-gray-300 mb-2">
                                You are about to permanently delete:
                            </p>
                            <div className="bg-black/40 rounded-lg p-3 border border-white/5 mb-4">
                                <p className="font-bold text-white">{deleteTarget.name}</p>
                                <p className="text-xs text-gray-400 font-mono">{deleteTarget.email} • {deleteTarget.role}</p>
                            </div>
                            <p className="text-xs text-gray-500 mb-6">
                                This will also remove all associated calls, vitals, bookings, and training reports. This action cannot be undone.
                            </p>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deleting}
                                    className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 text-sm font-bold hover:bg-white/10 transition-colors border border-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => deleteUser(deleteTarget.id)}
                                    disabled={deleting}
                                    className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-bold hover:bg-danger/80 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center gap-2"
                                >
                                    {deleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={14} />
                                            Delete Permanently
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <GlassCard>
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="text-accent-cyan" />
                    Pending Approvals
                </h3>
                {pendingUsers.length === 0 ? (
                    <p className="text-gray-400">No pending approvals.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-gray-300">
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Requested Role</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingUsers.map(user => (
                                    <tr key={user.id} className="border-b border-white/5">
                                        <td className="p-3 text-white">{user.name}</td>
                                        <td className="p-3 text-gray-300">{user.email}</td>
                                        <td className="p-3">
                                            <span className="px-2 py-1 rounded bg-white/10 text-sm capitalize">{user.role}</span>
                                        </td>
                                        <td className="p-3 flex gap-2">
                                            <GlassButton variant="primary" onClick={() => approveUser(user.id)} className="py-1 px-3 text-sm" style={{ padding: '0.25rem 0.75rem', minWidth: 'auto' }}>
                                                Approve
                                            </GlassButton>
                                            <GlassButton variant="danger" onClick={() => setDeleteTarget(user)} className="py-1 px-3 text-sm border-danger/50" style={{ padding: '0.25rem 0.75rem', minWidth: 'auto' }}>
                                                Reject
                                            </GlassButton>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </GlassCard>

            <GlassCard>
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="text-accent-magenta" />
                    Active Users Roster
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-gray-300">
                                <th className="p-3">Name</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeUsers.map(user => (
                                <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                    <td className="p-3 text-white">{user.name}</td>
                                    <td className="p-3 text-gray-300">{user.email}</td>
                                    <td className="p-3">
                                        <select
                                            value={user.role}
                                            onChange={(e) => changeRole(user.id, e.target.value)}
                                            className="bg-transparent border border-white/20 text-white rounded p-1 outline-none ring-0 w-full"
                                        >
                                            <option value="user" className="bg-[#111]">User</option>
                                            <option value="doctor" className="bg-[#111]">Doctor</option>
                                            <option value="admin" className="bg-[#111]">Admin</option>
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        <button 
                                            onClick={() => setDeleteTarget(user)} 
                                            className="text-gray-400 hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-danger/10"
                                            title="Delete User"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}


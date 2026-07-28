'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';
import { ClipboardList, Plus, Users, Stethoscope, Layers, Trash2, Edit3, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface Department {
    id: number; organization_id: number; name: string;
    head_doctor_id: number | null; head_doctor_name: string | null;
    floor: string | null; description: string | null;
    bed_count: number; is_active: boolean; doctor_count: number;
    created_at: string;
}

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [editId, setEditId] = useState<number | null>(null);

    // Form state
    const [form, setForm] = useState({ name: '', floor: '', description: '', bed_count: 0 });

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchDepartments = useCallback(async () => {
        try {
            const res = await fetch(apiUrl('/api/org/departments'), { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setDepartments(await res.json().catch(() => ({})));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(apiUrl('/api/org/departments'), {
                method: 'POST', headers,
                body: JSON.stringify({ name: form.name, floor: form.floor || null, description: form.description || null, bed_count: form.bed_count })
            });
            if (res.ok) { setShowAdd(false); setForm({ name: '', floor: '', description: '', bed_count: 0 }); fetchDepartments(); }
        } catch (err) { console.error(err); }
    };

    const handleUpdate = async (deptId: number) => {
        try {
            await fetch(apiUrl(`/api/org/departments/${deptId}`), {
                method: 'PUT', headers,
                body: JSON.stringify({ name: form.name, floor: form.floor || null, description: form.description || null, bed_count: form.bed_count })
            });
            setEditId(null);
            fetchDepartments();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (deptId: number) => {
        if (!confirm('Permanently delete this department?')) return;
        try {
            await fetch(apiUrl(`/api/org/departments/${deptId}`), { method: 'DELETE', headers });
            fetchDepartments();
        } catch (err) { console.error(err); }
    };

    const startEdit = (dept: Department) => {
        setEditId(dept.id);
        setForm({ name: dept.name, floor: dept.floor || '', description: dept.description || '', bed_count: dept.bed_count });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-2 border-accent-purple/20 border-t-accent-purple rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <SplitText text="DEPARTMENT_MATRIX" className="text-2xl font-black text-white tracking-[0.15em]" />
                    <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-[0.2em]">Manage hospital wings and specializations</p>
                </div>
                <GlassButton onClick={() => { setShowAdd(true); setForm({ name: '', floor: '', description: '', bed_count: 0 }); }} className="gap-2">
                    <Plus size={16} /> Add Department
                </GlassButton>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                <GlassCard className="p-4 text-center">
                    <p className="text-2xl font-black text-white">{departments.length}</p>
                    <p className="text-[9px] font-mono text-gray-500 uppercase">Total Departments</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                    <p className="text-2xl font-black text-accent-cyan">{departments.reduce((s, d) => s + d.bed_count, 0)}</p>
                    <p className="text-[9px] font-mono text-gray-500 uppercase">Total Beds</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                    <p className="text-2xl font-black text-accent-purple">{departments.reduce((s, d) => s + d.doctor_count, 0)}</p>
                    <p className="text-[9px] font-mono text-gray-500 uppercase">Assigned Doctors</p>
                </GlassCard>
            </div>

            {/* Add Form */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <GlassCard className="p-8 border-accent-purple/30">
                            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                                <ClipboardList className="text-accent-purple" /> Initialize New Department
                            </h2>
                            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <GlassInput label="Department Name" placeholder="e.g. Cardiology" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required icon={<ClipboardList size={16} />} />
                                <GlassInput label="Floor / Wing" placeholder="e.g. Floor 3, East Wing" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} icon={<MapPin size={16} />} />
                                <GlassInput label="Bed Capacity" type="number" placeholder="0" value={String(form.bed_count)} onChange={e => setForm({ ...form, bed_count: parseInt(e.target.value) || 0 })} icon={<Layers size={16} />} />
                                <div className="flex items-end gap-3">
                                    <GlassButton type="submit" className="flex-1 justify-center bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple border-accent-purple/40 font-bold">
                                        DEPLOY_DEPARTMENT
                                    </GlassButton>
                                    <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-xs hover:bg-white/10 transition-all">Cancel</button>
                                </div>
                            </form>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Department Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept, i) => (
                    <motion.div key={dept.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                        <GlassCard className="p-6 hover:border-accent-purple/30 transition-all group overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-1 h-full bg-accent-purple/60" />

                            {editId === dept.id ? (
                                /* EDIT MODE */
                                <div className="space-y-3">
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-purple/50" />
                                    <input value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-purple/50" placeholder="Floor" />
                                    <input type="number" value={form.bed_count} onChange={e => setForm({ ...form, bed_count: parseInt(e.target.value) || 0 })} className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-purple/50" />
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdate(dept.id)} className="flex-1 py-2 rounded-lg bg-accent-purple/20 border border-accent-purple/40 text-accent-purple text-xs font-bold hover:bg-accent-purple/30 transition-all">Save</button>
                                        <button onClick={() => setEditId(null)} className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs hover:bg-white/10 transition-all">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                /* VIEW MODE */
                                <>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-xl bg-accent-purple/10 border border-accent-purple/20">
                                            <ClipboardList size={22} className="text-accent-purple" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEdit(dept)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"><Edit3 size={14} /></button>
                                            <button onClick={() => handleDelete(dept.id)} className="p-2 rounded-lg bg-danger/10 hover:bg-danger text-danger hover:text-white transition-all"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-tight">{dept.name}</h3>
                                    {dept.floor && <p className="text-[10px] font-mono text-gray-500 mb-4 flex items-center gap-1"><MapPin size={10} /> {dept.floor}</p>}
                                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-white">{dept.bed_count}</p>
                                            <p className="text-[8px] font-mono text-gray-500 uppercase">Beds</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-accent-blue">{dept.doctor_count}</p>
                                            <p className="text-[8px] font-mono text-gray-500 uppercase">Doctors</p>
                                        </div>
                                    </div>
                                    {dept.head_doctor_name && (
                                        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                                            <Stethoscope size={12} className="text-accent-cyan" />
                                            <span className="text-[10px] font-mono text-gray-400">HOD: <span className="text-white">{dept.head_doctor_name}</span></span>
                                        </div>
                                    )}
                                </>
                            )}
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            {departments.length === 0 && !showAdd && (
                <div className="py-16 text-center">
                    <ClipboardList size={48} className="text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm mb-4">No departments configured yet.</p>
                    <GlassButton onClick={() => setShowAdd(true)} className="gap-2 mx-auto"><Plus size={16} /> Create First Department</GlassButton>
                </div>
            )}
        </div>
    );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';
import { 
    Building2, Plus, Palette, Hash, Trash2, Search,
    Users, Stethoscope, Activity, Shield, ChevronRight,
    Pause, Play, Edit3, X, Eye
} from 'lucide-react';

interface Organization {
    id: number; name: string; org_code: string;
    address?: string; contact_email?: string; contact_phone?: string;
    subscription_tier: string; ai_philosophy: string;
    is_active: boolean; max_beds: number; max_doctors: number;
    primary_color: string; accent_color: string;
    doctor_count: number; patient_count: number;
    active_calls: number; created_at: string;
}

export default function OrganizationManagement() {
    const router = useRouter();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [search, setSearch] = useState('');

    // Form state
    const [form, setForm] = useState({
        name: '', org_code: '', address: '', contact_email: '', contact_phone: '',
        primary_color: '#0D6EFD', accent_color: '#00D4FF',
        subscription_tier: 'sentient', ai_philosophy: 'balanced',
        max_beds: 100, max_doctors: 50,
    });

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchOrgs = useCallback(async () => {
        try {
            const res = await fetch('/api/organizations', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setOrganizations(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/organizations', { method: 'POST', headers: authHeaders, body: JSON.stringify(form) });
            if (res.ok) {
                setShowAdd(false);
                resetForm();
                fetchOrgs();
            }
        } catch (err) { console.error(err); }
    };

    const handleUpdate = async (orgId: number) => {
        try {
            await fetch(`/api/organizations/${orgId}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(form) });
            setEditId(null);
            fetchOrgs();
        } catch (err) { console.error(err); }
    };

    const handleToggleSuspend = async (orgId: number) => {
        try {
            await fetch(`/api/organizations/${orgId}/suspend`, { method: 'PATCH', headers: authHeaders });
            fetchOrgs();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (orgId: number) => {
        if (!confirm('Permanently DELETE this organization? All linked users will be unlinked.')) return;
        try {
            await fetch(`/api/organizations/${orgId}`, { method: 'DELETE', headers: authHeaders });
            fetchOrgs();
        } catch (err) { console.error(err); }
    };

    const resetForm = () => setForm({
        name: '', org_code: '', address: '', contact_email: '', contact_phone: '',
        primary_color: '#0D6EFD', accent_color: '#00D4FF',
        subscription_tier: 'sentient', ai_philosophy: 'balanced',
        max_beds: 100, max_doctors: 50,
    });

    const startEdit = (org: Organization) => {
        setEditId(org.id);
        setForm({
            name: org.name, org_code: org.org_code, address: org.address || '',
            contact_email: org.contact_email || '', contact_phone: org.contact_phone || '',
            primary_color: org.primary_color, accent_color: org.accent_color,
            subscription_tier: org.subscription_tier, ai_philosophy: org.ai_philosophy,
            max_beds: org.max_beds, max_doctors: org.max_doctors,
        });
    };

    const filtered = organizations.filter(o => 
        o.name.toLowerCase().includes(search.toLowerCase()) || o.org_code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                <div>
                    <SplitText text="ORGANIZATION_MATRIX" className="text-2xl font-black text-white tracking-[0.15em]" />
                    <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-[0.2em]">{organizations.length} institutions in the Dignova network</p>
                </div>
                <GlassButton onClick={() => { setShowAdd(true); resetForm(); }} className="gap-2">
                    <Plus size={16} /> New Organization
                </GlassButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <GlassCard className="p-4 flex items-center gap-3">
                    <Building2 size={20} className="text-accent-blue" />
                    <div><p className="text-xl font-black text-white">{organizations.length}</p><p className="text-[8px] font-mono text-gray-500 uppercase">Total Orgs</p></div>
                </GlassCard>
                <GlassCard className="p-4 flex items-center gap-3">
                    <Stethoscope size={20} className="text-accent-cyan" />
                    <div><p className="text-xl font-black text-accent-cyan">{organizations.reduce((s, o) => s + o.doctor_count, 0)}</p><p className="text-[8px] font-mono text-gray-500 uppercase">Total Doctors</p></div>
                </GlassCard>
                <GlassCard className="p-4 flex items-center gap-3">
                    <Users size={20} className="text-accent-purple" />
                    <div><p className="text-xl font-black text-accent-purple">{organizations.reduce((s, o) => s + o.patient_count, 0)}</p><p className="text-[8px] font-mono text-gray-500 uppercase">Total Patients</p></div>
                </GlassCard>
                <GlassCard className="p-4 flex items-center gap-3">
                    <Activity size={20} className="text-danger" />
                    <div><p className="text-xl font-black text-danger">{organizations.reduce((s, o) => s + o.active_calls, 0)}</p><p className="text-[8px] font-mono text-gray-500 uppercase">Active Calls</p></div>
                </GlassCard>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-accent-blue/40 transition-all font-mono" />
            </div>

            {/* Add Form */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <GlassCard className="p-8 border-accent-blue/30 relative">
                            <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
                            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                                <Building2 className="text-accent-blue" /> Initialize New Node
                            </h2>
                            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <GlassInput label="Organization Name" placeholder="e.g. Manipal Hospital" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required icon={<Building2 size={16} />} />
                                <GlassInput label="Unique Org Code" placeholder="e.g. MANIPAL-2026" value={form.org_code} onChange={e => setForm({ ...form, org_code: e.target.value })} required icon={<Hash size={16} />} />
                                <GlassInput label="Address" placeholder="City, State" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                                <GlassInput label="Contact Email" placeholder="admin@hospital.org" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
                                <div>
                                    <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Subscription</label>
                                    <select value={form.subscription_tier} onChange={e => setForm({ ...form, subscription_tier: e.target.value })}
                                        className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-accent-blue/50">
                                        <option value="standard">Standard</option>
                                        <option value="sentient">Sentient</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">AI Philosophy</label>
                                    <select value={form.ai_philosophy} onChange={e => setForm({ ...form, ai_philosophy: e.target.value })}
                                        className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-accent-blue/50">
                                        <option value="conservative">Conservative</option>
                                        <option value="balanced">Balanced</option>
                                        <option value="aggressive">Aggressive</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <GlassInput label="Primary" type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} icon={<Palette size={16} />} />
                                    <GlassInput label="Accent" type="color" value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })} icon={<Palette size={16} />} />
                                </div>
                                <GlassInput label="Max Beds" type="number" value={String(form.max_beds)} onChange={e => setForm({ ...form, max_beds: parseInt(e.target.value) || 0 })} />
                                <div className="flex items-end">
                                    <GlassButton type="submit" className="w-full justify-center bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue border-accent-blue/40 font-bold">
                                        DEPLOY_ORGANIZATION
                                    </GlassButton>
                                </div>
                            </form>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Organization Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((org, i) => (
                    <motion.div key={org.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                        <GlassCard className={`p-6 transition-all group overflow-hidden relative ${!org.is_active ? 'opacity-50' : 'hover:border-white/20'}`}>
                            {/* Color bar */}
                            <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${org.primary_color}, ${org.accent_color})` }} />

                            <div className="flex justify-between items-start mb-3 pt-1">
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-all">
                                    <Building2 size={22} className="text-white/70" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-wider ${org.is_active ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                        {org.is_active ? 'ACTIVE' : 'OFF'}
                                    </span>
                                    <span className="text-[9px] font-mono text-gray-600">{org.org_code}</span>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1 tracking-tight">{org.name}</h3>
                            <p className="text-[9px] font-mono text-gray-500 mb-4">{org.subscription_tier.toUpperCase()} · AI: {org.ai_philosophy}</p>

                            {/* KPIs */}
                            <div className="grid grid-cols-3 gap-2 mb-4 py-3 border-y border-white/5">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-accent-blue">{org.doctor_count}</p>
                                    <p className="text-[7px] font-mono text-gray-500 uppercase">Doctors</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-accent-cyan">{org.patient_count}</p>
                                    <p className="text-[7px] font-mono text-gray-500 uppercase">Patients</p>
                                </div>
                                <div className="text-center">
                                    <p className={`text-lg font-bold ${org.active_calls > 0 ? 'text-danger' : 'text-gray-600'}`}>{org.active_calls}</p>
                                    <p className="text-[7px] font-mono text-gray-500 uppercase">Active</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button onClick={() => router.push(`/admin/organizations/${org.id}`)}
                                    className="flex-1 py-2 rounded-lg bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue text-[9px] font-bold uppercase tracking-widest border border-accent-blue/20 transition-all flex items-center justify-center gap-1">
                                    <Eye size={12} /> Drill-Down
                                </button>
                                <button onClick={() => startEdit(org)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5">
                                    <Edit3 size={14} />
                                </button>
                                <button onClick={() => handleToggleSuspend(org.id)} className={`p-2 rounded-lg border transition-all ${org.is_active ? 'bg-warning/10 hover:bg-warning/20 text-warning border-warning/20' : 'bg-success/10 hover:bg-success/20 text-success border-success/20'}`}>
                                    {org.is_active ? <Pause size={14} /> : <Play size={14} />}
                                </button>
                                <button onClick={() => handleDelete(org.id)} className="p-2 rounded-lg bg-danger/10 hover:bg-danger text-danger hover:text-white transition-all border border-danger/20">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setEditId(null); }}>
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-2xl">
                            <GlassCard className="!p-8 border-accent-blue/30 bg-black/95">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Edit3 className="text-accent-blue" /> Edit Organization
                                </h3>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="text-[9px] font-mono text-gray-500 uppercase mb-1 block">Name</label>
                                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-blue/50" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-mono text-gray-500 uppercase mb-1 block">Address</label>
                                        <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-blue/50" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-mono text-gray-500 uppercase mb-1 block">Subscription</label>
                                        <select value={form.subscription_tier} onChange={e => setForm({ ...form, subscription_tier: e.target.value })}
                                            className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-white text-sm focus:outline-none">
                                            <option value="standard">Standard</option>
                                            <option value="sentient">Sentient</option>
                                            <option value="enterprise">Enterprise</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-mono text-gray-500 uppercase mb-1 block">AI Philosophy</label>
                                        <select value={form.ai_philosophy} onChange={e => setForm({ ...form, ai_philosophy: e.target.value })}
                                            className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-white text-sm focus:outline-none">
                                            <option value="conservative">Conservative</option>
                                            <option value="balanced">Balanced</option>
                                            <option value="aggressive">Aggressive</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-[9px] font-mono text-gray-500 uppercase mb-1 block">Primary</label>
                                            <input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} className="w-full h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[9px] font-mono text-gray-500 uppercase mb-1 block">Accent</label>
                                            <input type="color" value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })} className="w-full h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-[9px] font-mono text-gray-500 uppercase mb-1 block">Max Beds</label>
                                            <input type="number" value={form.max_beds} onChange={e => setForm({ ...form, max_beds: parseInt(e.target.value) || 0 })} className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-white text-sm focus:outline-none" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[9px] font-mono text-gray-500 uppercase mb-1 block">Max Doctors</label>
                                            <input type="number" value={form.max_doctors} onChange={e => setForm({ ...form, max_doctors: parseInt(e.target.value) || 0 })} className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-white text-sm focus:outline-none" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setEditId(null)} className="flex-1 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold uppercase hover:bg-white/10 transition-all">Cancel</button>
                                    <button onClick={() => handleUpdate(editId)} className="flex-1 py-3 rounded-lg bg-accent-blue/20 border border-accent-blue/50 text-accent-blue text-xs font-bold uppercase hover:bg-accent-blue/30 transition-all">Save Changes</button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {filtered.length === 0 && !showAdd && (
                <div className="py-16 text-center">
                    <Building2 size={48} className="text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No organizations found.</p>
                </div>
            )}
        </div>
    );
}

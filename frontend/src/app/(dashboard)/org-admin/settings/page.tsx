'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';
import { Settings, Shield, Palette, Brain, Activity, Save, RefreshCcw, ChevronRight, Sliders } from 'lucide-react';

interface OrgSettings {
    id: number; name: string; org_code: string;
    ai_philosophy: string; primary_color: string; accent_color: string;
    address?: string; contact_email?: string; contact_phone?: string;
    stress_threshold?: number; max_beds?: number; max_doctors?: number;
}

export default function OrgSettingsPage() {
    const [org, setOrg] = useState<OrgSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Editable form
    const [form, setForm] = useState({
        name: '', address: '', contact_email: '', contact_phone: '',
        ai_philosophy: 'balanced', primary_color: '#06b6d4', accent_color: '#a855f7',
        max_beds: 100, max_doctors: 50, stress_threshold: 0.75,
    });

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/org/dashboard', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                const o = data.organization;
                setOrg(o);
                setForm({
                    name: o.name || '', address: o.address || '',
                    contact_email: o.contact_email || '', contact_phone: o.contact_phone || '',
                    ai_philosophy: o.ai_philosophy || 'balanced',
                    primary_color: o.primary_color || '#06b6d4',
                    accent_color: o.accent_color || '#a855f7',
                    max_beds: data.capacity?.max_beds || 100,
                    max_doctors: data.capacity?.max_doctors || 50,
                    stress_threshold: o.stress_threshold || 0.75,
                });
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/org/settings', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
                // Update CSS variables
                document.documentElement.style.setProperty('--org-primary', form.primary_color);
                document.documentElement.style.setProperty('--org-accent', form.accent_color);
            }
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    if (loading || !org) {
        return <div className="flex items-center justify-center h-[60vh]"><div className="w-12 h-12 border-2 border-accent-purple/20 border-t-accent-purple rounded-full animate-spin" /></div>;
    }

    const philosophyOptions = [
        { value: 'aggressive', label: 'Aggressive', desc: 'Maximum AI autonomy. Fewer human checkpoints.', color: 'danger' },
        { value: 'balanced', label: 'Balanced', desc: 'AI handles standard, escalates elevated+.', color: 'accent-blue' },
        { value: 'conservative', label: 'Conservative', desc: 'All AI decisions need doctor approval.', color: 'success' },
    ];

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <SplitText text="ORG_SETTINGS" className="text-2xl font-black text-white tracking-[0.15em]" />
                    <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-[0.2em]">Configure {org.name}</p>
                </div>
                <GlassButton onClick={handleSave} className={`gap-2 ${saved ? '!bg-success/20 !border-success/40 !text-success' : ''}`}>
                    {saving ? <RefreshCcw size={16} className="animate-spin" /> : saved ? <span>✓ Saved</span> : <><Save size={16} /> Save Changes</>}
                </GlassButton>
            </div>

            {/* IDENTITY */}
            <BlurIn delay={0.1}>
                <GlassCard className="p-6 border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Shield className="text-accent-blue" size={18} /> Organization_Identity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Name</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-blue/50 transition-all" />
                        </div>
                        <div>
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Org Code</label>
                            <input value={org.org_code} disabled className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-gray-500 cursor-not-allowed font-mono" />
                        </div>
                        <div>
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Address</label>
                            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-blue/50 transition-all" placeholder="Hospital address..." />
                        </div>
                        <div>
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Contact Phone</label>
                            <input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })}
                                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-blue/50 transition-all" placeholder="+91..." />
                        </div>
                    </div>
                </GlassCard>
            </BlurIn>

            {/* AI PHILOSOPHY */}
            <BlurIn delay={0.2}>
                <GlassCard className="p-6 border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Brain className="text-accent-purple" size={18} /> AI_Philosophy
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {philosophyOptions.map(opt => (
                            <motion.button
                                key={opt.value}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setForm({ ...form, ai_philosophy: opt.value })}
                                className={`p-5 rounded-xl text-left transition-all ${form.ai_philosophy === opt.value
                                    ? `bg-${opt.color}/20 border-2 border-${opt.color}/50 shadow-[0_0_20px_rgba(0,0,0,0.3)]`
                                    : 'bg-black/40 border border-white/5 hover:border-white/15'}`}
                            >
                                <p className={`text-sm font-bold uppercase tracking-wider ${form.ai_philosophy === opt.value ? `text-${opt.color}` : 'text-white'}`}>{opt.label}</p>
                                <p className="text-[10px] font-mono text-gray-500 mt-2 leading-relaxed">{opt.desc}</p>
                                {form.ai_philosophy === opt.value && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`mt-3 w-2 h-2 rounded-full bg-${opt.color}`} />
                                )}
                            </motion.button>
                        ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/5">
                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2 block">Stress Threshold ({(form.stress_threshold * 100).toFixed(0)}%)</label>
                        <input type="range" min="0.3" max="1.0" step="0.05" value={form.stress_threshold}
                            onChange={e => setForm({ ...form, stress_threshold: parseFloat(e.target.value) })}
                            className="w-full accent-accent-purple" />
                        <p className="text-[9px] font-mono text-gray-600 mt-1">Telemetry trigger point — lower = more sensitive alerts</p>
                    </div>
                </GlassCard>
            </BlurIn>

            {/* BRANDING */}
            <BlurIn delay={0.3}>
                <GlassCard className="p-6 border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Palette className="text-accent-cyan" size={18} /> OS_Skin
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2 block">Primary Color</label>
                            <div className="flex items-center gap-3">
                                <input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })}
                                    className="w-12 h-12 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                                <input value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })}
                                    className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-2 block">Accent Color</label>
                            <div className="flex items-center gap-3">
                                <input type="color" value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })}
                                    className="w-12 h-12 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                                <input value={form.accent_color} onChange={e => setForm({ ...form, accent_color: e.target.value })}
                                    className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none" />
                            </div>
                        </div>
                    </div>
                    {/* Preview */}
                    <div className="mt-6 p-4 rounded-xl border border-white/5" style={{ background: `linear-gradient(135deg, ${form.primary_color}15, ${form.accent_color}15)` }}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: form.primary_color }} />
                            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: form.accent_color }} />
                            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider ml-2">Preview Gradient</span>
                        </div>
                    </div>
                </GlassCard>
            </BlurIn>

            {/* CAPACITY */}
            <BlurIn delay={0.4}>
                <GlassCard className="p-6 border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Sliders className="text-warning" size={18} /> Capacity_Config
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Max Beds</label>
                            <input type="number" value={form.max_beds} onChange={e => setForm({ ...form, max_beds: parseInt(e.target.value) || 0 })}
                                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-warning/50 transition-all" />
                        </div>
                        <div>
                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Max Doctors</label>
                            <input type="number" value={form.max_doctors} onChange={e => setForm({ ...form, max_doctors: parseInt(e.target.value) || 0 })}
                                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-warning/50 transition-all" />
                        </div>
                    </div>
                </GlassCard>
            </BlurIn>
        </div>
    );
}

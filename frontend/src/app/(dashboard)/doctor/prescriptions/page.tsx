'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { FileText, Plus, Download, User, Pill, Stethoscope, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface Medication { name: string; dosage: string; frequency: string; duration: string; instructions: string; }
interface Prescription { id: number; patient_id: number; doctor_id: number; diagnosis: string; medications: Medication[]; notes: string; created_at: string; pdf_path: string; }
interface Patient { id: number; name: string; email: string; age: number; blood_group: string; }

const emptyMed: Medication = { name: '', dosage: '', frequency: '', duration: '', instructions: '' };

export default function DoctorPrescriptionsPage() {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const [form, setForm] = useState({ patient_id: '', diagnosis: '', notes: '' });
    const [meds, setMeds] = useState<Medication[]>([{ ...emptyMed }]);

    const token = () => localStorage.getItem('access_token') || '';

    useEffect(() => {
        Promise.all([
            fetch(apiUrl('/api/hospital/prescriptions/doctor'), { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json().catch(() => ({})) : []),
            fetch(apiUrl('/api/hospital/patients'), { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.ok ? r.json().catch(() => ({})) : []),
        ]).then(([rx, pts]) => { setPrescriptions(rx); setPatients(pts); }).finally(() => setLoading(false));
    }, []);

    const addMed = () => setMeds(m => [...m, { ...emptyMed }]);
    const removeMed = (i: number) => setMeds(m => m.filter((_, idx) => idx !== i));
    const updateMed = (i: number, field: keyof Medication, value: string) => setMeds(m => m.map((med, idx) => idx === i ? { ...med, [field]: value } : med));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(apiUrl('/api/hospital/prescriptions/create'), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient_id: parseInt(form.patient_id), diagnosis: form.diagnosis, notes: form.notes, medications: meds })
            });
            if (res.ok) {
                const newRx = await res.json().catch(() => ({}));
                setPrescriptions(p => [newRx, ...p]);
                setShowForm(false);
                setForm({ patient_id: '', diagnosis: '', notes: '' });
                setMeds([{ ...emptyMed }]);
            }
        } finally { setSubmitting(false); }
    };

    const downloadPdf = (id: number) => window.open(`/api/hospital/prescriptions/${id}/pdf`, '_blank');

    const inputCls = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-accent-cyan/50 transition-colors placeholder:text-white/20";

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase">Prescriptions</h1>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-1 flex items-center gap-2"><Stethoscope size={12} className="text-accent-cyan" /> Issue & Manage Patient Prescriptions</p>
                </div>
                <GlassButton onClick={() => setShowForm(v => !v)} className="gap-2">{showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? 'Cancel' : 'New Prescription'}</GlassButton>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }}>
                        <GlassCard className="p-8 border-accent-cyan/20 bg-accent-cyan/5">
                            <h2 className="text-sm font-black text-accent-cyan uppercase tracking-widest mb-6 flex items-center gap-2"><FileText size={16} /> New Prescription</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block mb-2">Patient *</label>
                                        <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} className={inputCls} required>
                                            <option value="">Select Patient...</option>
                                            {patients.map(p => <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block mb-2">Diagnosis *</label>
                                        <input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} className={inputCls} placeholder="Clinical diagnosis..." required />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2"><Pill size={12} /> Medications *</label>
                                        <button type="button" onClick={addMed} className="text-[10px] font-mono text-accent-cyan hover:underline flex items-center gap-1"><Plus size={12} /> Add Medication</button>
                                    </div>
                                    <div className="space-y-3">
                                        {meds.map((med, i) => (
                                            <div key={i} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-4 rounded-xl bg-black/20 border border-white/5 relative">
                                                {meds.length > 1 && <button type="button" onClick={() => removeMed(i)} className="absolute top-2 right-2 text-white/20 hover:text-rose-500 transition-colors"><X size={14} /></button>}
                                                {(['name', 'dosage', 'frequency', 'duration', 'instructions'] as const).map(f => (
                                                    <input key={f} value={med[f]} onChange={e => updateMed(i, f, e.target.value)} className={inputCls} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} required={f !== 'instructions'} />
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block mb-2">Physician Notes</label>
                                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} h-24 resize-none`} placeholder="Additional notes or instructions..." />
                                </div>

                                <div className="flex justify-end gap-3">
                                    <GlassButton type="button" onClick={() => setShowForm(false)} className="border-white/10">Cancel</GlassButton>
                                    <GlassButton type="submit" disabled={submitting} className="gap-2 bg-accent-cyan/20 border-accent-cyan/40 text-accent-cyan">
                                        {submitting ? 'Generating PDF...' : <><Check size={16} /> Issue Prescription</>}
                                    </GlassButton>
                                </div>
                            </form>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-4">
                {prescriptions.length === 0 ? (
                    <GlassCard className="p-12 text-center"><FileText size={40} className="mx-auto mb-4 text-white/20" /><p className="text-white/40 font-mono text-sm">No prescriptions issued yet</p></GlassCard>
                ) : prescriptions.map(rx => (
                    <GlassCard key={rx.id} className="border-white/5 overflow-hidden">
                        <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === rx.id ? null : rx.id)}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center"><FileText size={18} className="text-accent-cyan" /></div>
                                <div>
                                    <p className="font-bold text-white">RX-{String(rx.id).padStart(6, '0')} <span className="text-white/40 font-normal">· Patient #{rx.patient_id}</span></p>
                                    <p className="text-xs text-white/40">{rx.diagnosis} · {new Date(rx.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={e => { e.stopPropagation(); downloadPdf(rx.id); }} className="flex items-center gap-2 text-[10px] font-mono text-accent-cyan hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-accent-cyan/30 hover:border-white/20"><Download size={14} /> PDF</button>
                                {expandedId === rx.id ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                            </div>
                        </div>
                        <AnimatePresence>
                            {expandedId === rx.id && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5 overflow-hidden">
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Medications</p>
                                            <div className="space-y-2">
                                                {(rx.medications || []).map((m, i) => (
                                                    <div key={i} className="flex flex-wrap gap-4 p-3 rounded-lg bg-black/30 border border-white/5">
                                                        <span className="text-sm font-bold text-white">{m.name}</span>
                                                        <span className="text-xs text-accent-cyan">{m.dosage}</span>
                                                        <span className="text-xs text-white/50">{m.frequency}</span>
                                                        <span className="text-xs text-white/50">{m.duration}</span>
                                                        {m.instructions && <span className="text-xs text-white/30 italic">{m.instructions}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {rx.notes && <div><p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">Notes</p><p className="text-sm text-white/60">{rx.notes}</p></div>}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
}

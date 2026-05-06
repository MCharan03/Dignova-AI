'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { FileText, Download, Pill, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface Medication { name: string; dosage: string; frequency: string; duration: string; instructions: string; }
interface Prescription { id: number; doctor_id: number; diagnosis: string; medications: Medication[]; notes: string; created_at: string; pdf_path: string; }

export default function PatientPrescriptionsPage() {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const token = () => localStorage.getItem('access_token') || '';

    useEffect(() => {
        fetch('/api/hospital/prescriptions/me', { headers: { Authorization: `Bearer ${token()}` } })
            .then(r => r.ok ? r.json() : [])
            .then(setPrescriptions)
            .finally(() => setLoading(false));
    }, []);

    const downloadPdf = (id: number) => window.open(`/api/hospital/prescriptions/${id}/pdf`, '_blank');

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="flex flex-col gap-8 pb-20">
            <header>
                <h1 className="text-3xl font-black text-white tracking-widest uppercase">My Prescriptions</h1>
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mt-1 flex items-center gap-2"><ShieldCheck size={12} className="text-accent-cyan" /> Secured Medical Records</p>
            </header>

            {prescriptions.length === 0 ? (
                <GlassCard className="p-16 text-center">
                    <FileText size={48} className="mx-auto mb-4 text-white/20" />
                    <p className="text-white/40 font-mono">No prescriptions on file</p>
                    <p className="text-[10px] text-white/20 font-mono mt-2">Prescriptions issued by your doctor will appear here</p>
                </GlassCard>
            ) : (
                <div className="space-y-4">
                    {prescriptions.map((rx, idx) => (
                        <motion.div key={rx.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
                            <GlassCard className="border-white/5 overflow-hidden hover:border-accent-cyan/20 transition-all">
                                <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === rx.id ? null : rx.id)}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center">
                                            <FileText size={22} className="text-accent-cyan" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-lg">RX-{String(rx.id).padStart(6, '0')}</p>
                                            <p className="text-sm text-white/50">{rx.diagnosis}</p>
                                            <p className="text-[10px] font-mono text-white/30 mt-0.5">{new Date(rx.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={e => { e.stopPropagation(); downloadPdf(rx.id); }}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-[10px] font-mono uppercase hover:bg-accent-cyan/20 transition-all"
                                        >
                                            <Download size={14} /> Download PDF
                                        </button>
                                        {expandedId === rx.id ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                                    </div>
                                </div>

                                {expandedId === rx.id && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/5">
                                        <div className="p-6 space-y-6">
                                            <div>
                                                <p className="text-[10px] font-mono text-accent-cyan uppercase tracking-widest mb-3 flex items-center gap-2"><Pill size={12} /> Prescribed Medications</p>
                                                <div className="space-y-2">
                                                    {(rx.medications || []).map((m, i) => (
                                                        <div key={i} className="p-4 rounded-xl bg-black/30 border border-white/5 grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            <div><p className="text-[9px] text-white/30 uppercase font-mono">Drug</p><p className="text-sm font-bold text-white">{m.name}</p></div>
                                                            <div><p className="text-[9px] text-white/30 uppercase font-mono">Dosage</p><p className="text-sm text-accent-cyan">{m.dosage}</p></div>
                                                            <div><p className="text-[9px] text-white/30 uppercase font-mono">Frequency</p><p className="text-sm text-white/70">{m.frequency}</p></div>
                                                            <div><p className="text-[9px] text-white/30 uppercase font-mono">Duration</p><p className="text-sm text-white/70">{m.duration}</p></div>
                                                            {m.instructions && <div className="col-span-full"><p className="text-[9px] text-white/30 uppercase font-mono">Instructions</p><p className="text-xs text-white/50 italic">{m.instructions}</p></div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            {rx.notes && (
                                                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                                    <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest mb-1">Physician Notes</p>
                                                    <p className="text-sm text-white/60">{rx.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

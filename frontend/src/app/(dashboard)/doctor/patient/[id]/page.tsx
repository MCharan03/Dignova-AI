'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';
import { apiUrl } from '@/lib/api';
import {
    ArrowLeft, HeartPulse, Activity, Droplets, Thermometer, Wind,
    Brain, TrendingUp, TrendingDown, AlertTriangle, FileText,
    Stethoscope, Pill, Clock, Calendar, Plus, Send, ChevronRight
} from 'lucide-react';

interface PatientProfile {
    id: number; name: string; email: string;
    age: number | null; blood_group: string | null;
    chronic_conditions: string | null; phone_number: string | null;
    emergency_contact: string | null;
}

interface VitalEntry {
    id: number; heart_rate: number | null; systolic_bp: number | null; diastolic_bp: number | null;
    spo2: number | null; temperature: number | null; respiratory_rate: number | null;
    blood_glucose: number | null; weight_kg: number | null;
    source: string; notes: string | null; recorded_at: string;
}

interface CallEntry {
    call_id: number; diagnosis_given: string | null; severity: string;
    state: string; start_time: string; end_time: string | null;
    confidence_score: number | null;
}

interface Prediction {
    risk_level: string; risk_score: number;
    predictions: { condition: string; probability: number; timeframe: string }[];
    recommendations: string[];
    trend: string;
}

type Tab = 'vitals' | 'history' | 'notes' | 'predict';

export default function PatientDeepView() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;

    const [patient, setPatient] = useState<PatientProfile | null>(null);
    const [vitals, setVitals] = useState<VitalEntry[]>([]);
    const [calls, setCalls] = useState<CallEntry[]>([]);
    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('vitals');
    const [noteText, setNoteText] = useState('');
    const [notes, setNotes] = useState<any[]>([]);

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchData = useCallback(async () => {
        try {
            const [profileRes, vitalsRes, callsRes, notesRes] = await Promise.all([
                fetch(apiUrl(`/api/users/${patientId}`), { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(apiUrl(`/api/org/vitals/history?user_id=${patientId}&limit=50`), { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(apiUrl(`/api/calls?user_id=${patientId}`), { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(apiUrl(`/api/hospital/notes/${patientId}`), { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            if (profileRes.ok) setPatient(await profileRes.json().catch(() => ({})));
            if (vitalsRes.ok) setVitals(await vitalsRes.json().catch(() => ({})));
            if (callsRes.ok) {
                const callData = await callsRes.json().catch(() => ({}));
                setCalls(Array.isArray(callData) ? callData : []);
            }
            if (notesRes.ok) setNotes(await notesRes.json().catch(() => ({})));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [patientId, token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fetchPrediction = async () => {
        try {
            const res = await fetch(apiUrl(`/api/ai/predict/${patientId}`), { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setPrediction(await res.json().catch(() => ({})));
        } catch (err) { console.error(err); }
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        try {
            await fetch(apiUrl(`/api/hospital/notes/${patientId}`), {
                method: 'POST', headers,
                body: JSON.stringify({ content: noteText, type: 'clinical' })
            });
            setNoteText('');
            fetchData();
        } catch (err) { console.error(err); }
    };

    // Vital status helpers
    const vitalStatus = (val: number | null, low: number, high: number) => {
        if (val === null) return { color: 'text-gray-500', status: 'N/A' };
        if (val < low) return { color: 'text-accent-blue', status: 'LOW' };
        if (val > high) return { color: 'text-danger', status: 'HIGH' };
        return { color: 'text-success', status: 'NORMAL' };
    };

    if (loading) {
        return <div className="flex items-center justify-center h-[60vh]"><div className="w-12 h-12 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" /></div>;
    }

    if (!patient) {
        return <div className="flex items-center justify-center h-[60vh]"><p className="text-gray-500">Patient not found.</p></div>;
    }

    const latestVitals = vitals[0];

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                    <ArrowLeft size={18} className="text-gray-400" />
                </button>
                <div className="flex-1">
                    <SplitText text={patient.name.toUpperCase()} className="text-2xl font-black text-white tracking-[0.12em]" />
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em]">PID-{patient.id}</span>
                        {patient.age && <><span className="w-1 h-1 rounded-full bg-white/20" /><span className="text-[9px] font-mono text-gray-500">{patient.age} yrs</span></>}
                        {patient.blood_group && (
                            <><span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="flex items-center gap-1 text-[9px] font-mono text-danger font-bold"><Droplets size={10} />{patient.blood_group}</span></>
                        )}
                        {patient.chronic_conditions && (
                            <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-warning/20 text-warning border border-warning/30">{patient.chronic_conditions}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Live Vitals Strip */}
            {latestVitals && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                        { label: 'Heart Rate', value: latestVitals.heart_rate, unit: 'bpm', icon: HeartPulse, ...vitalStatus(latestVitals.heart_rate, 60, 100) },
                        { label: 'Systolic BP', value: latestVitals.systolic_bp, unit: 'mmHg', icon: Activity, ...vitalStatus(latestVitals.systolic_bp, 90, 140) },
                        { label: 'Diastolic BP', value: latestVitals.diastolic_bp, unit: 'mmHg', icon: Activity, ...vitalStatus(latestVitals.diastolic_bp, 60, 90) },
                        { label: 'SpO2', value: latestVitals.spo2, unit: '%', icon: Wind, ...vitalStatus(latestVitals.spo2, 95, 101) },
                        { label: 'Temp', value: latestVitals.temperature, unit: '°C', icon: Thermometer, ...vitalStatus(latestVitals.temperature, 36.1, 37.5) },
                        { label: 'Resp Rate', value: latestVitals.respiratory_rate, unit: '/min', icon: Wind, ...vitalStatus(latestVitals.respiratory_rate, 12, 20) },
                        { label: 'Glucose', value: latestVitals.blood_glucose, unit: 'mg/dL', icon: Droplets, ...vitalStatus(latestVitals.blood_glucose, 70, 140) },
                    ].map((v, i) => (
                        <GlassCard key={i} className="p-3 border-white/5 hover:border-white/10 transition-all">
                            <div className="flex items-center gap-2 mb-1">
                                <v.icon size={12} className={v.color} />
                                <span className="text-[7px] font-mono text-gray-500 uppercase tracking-wider">{v.label}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-black ${v.color}`}>{v.value ?? '—'}</span>
                                <span className="text-[8px] font-mono text-gray-600">{v.unit}</span>
                            </div>
                            <span className={`text-[7px] font-black uppercase tracking-wider ${v.color}`}>{v.status}</span>
                        </GlassCard>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/5">
                {([
                    { key: 'vitals', label: 'Vitals Timeline', icon: HeartPulse },
                    { key: 'history', label: 'Call History', icon: Stethoscope },
                    { key: 'notes', label: 'Clinical Notes', icon: FileText },
                    { key: 'predict', label: 'AI Prediction', icon: Brain },
                ] as const).map(tab => (
                    <button key={tab.key} onClick={() => { setActiveTab(tab.key); if (tab.key === 'predict' && !prediction) fetchPrediction(); }}
                        className={`px-4 py-3 text-[10px] font-mono uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === tab.key ? 'border-accent-blue text-accent-blue' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* VITALS TIMELINE TAB */}
            {activeTab === 'vitals' && (
                <div className="space-y-4">
                    {/* Mini sparkline chart */}
                    {vitals.length > 1 && (
                        <GlassCard className="p-6 border-white/5">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Heart Rate Trend (Last {Math.min(vitals.length, 20)} readings)</h3>
                            <div className="h-32 flex items-end gap-1">
                                {vitals.slice(0, 20).reverse().map((v, i) => {
                                    const hr = v.heart_rate || 0;
                                    const maxHr = Math.max(...vitals.slice(0, 20).map(x => x.heart_rate || 0), 1);
                                    return (
                                        <motion.div key={v.id} initial={{ height: 0 }} animate={{ height: `${(hr / maxHr) * 100}%` }}
                                            transition={{ delay: i * 0.02 }}
                                            className={`flex-1 rounded-t-sm min-h-[2px] ${hr > 100 ? 'bg-danger/60' : hr < 60 ? 'bg-accent-blue/60' : 'bg-success/60'}`}
                                            title={`${hr} bpm — ${new Date(v.recorded_at).toLocaleDateString()}`} />
                                    );
                                })}
                            </div>
                        </GlassCard>
                    )}
                    {/* Vitals entries */}
                    <div className="space-y-2">
                        {vitals.map((v, i) => (
                            <motion.div key={v.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                                <GlassCard className="p-4 border-white/5 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center shrink-0">
                                        <HeartPulse size={18} className="text-accent-cyan" />
                                    </div>
                                    <div className="flex-1 grid grid-cols-3 md:grid-cols-6 gap-2">
                                        <div><p className="text-[8px] font-mono text-gray-500 uppercase">HR</p><p className="text-sm font-bold text-white">{v.heart_rate ?? '—'}</p></div>
                                        <div><p className="text-[8px] font-mono text-gray-500 uppercase">BP</p><p className="text-sm font-bold text-white">{v.systolic_bp ?? '—'}/{v.diastolic_bp ?? '—'}</p></div>
                                        <div><p className="text-[8px] font-mono text-gray-500 uppercase">SpO2</p><p className="text-sm font-bold text-white">{v.spo2 ?? '—'}%</p></div>
                                        <div><p className="text-[8px] font-mono text-gray-500 uppercase">Temp</p><p className="text-sm font-bold text-white">{v.temperature ?? '—'}°</p></div>
                                        <div><p className="text-[8px] font-mono text-gray-500 uppercase">Resp</p><p className="text-sm font-bold text-white">{v.respiratory_rate ?? '—'}</p></div>
                                        <div><p className="text-[8px] font-mono text-gray-500 uppercase">Glucose</p><p className="text-sm font-bold text-white">{v.blood_glucose ?? '—'}</p></div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[9px] font-mono text-gray-500">{new Date(v.recorded_at).toLocaleDateString()}</p>
                                        <p className="text-[8px] font-mono text-gray-600">{new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        <span className={`text-[7px] font-mono uppercase ${v.source === 'iot' ? 'text-accent-cyan' : 'text-gray-500'}`}>{v.source}</span>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>
                    {vitals.length === 0 && <div className="py-12 text-center text-gray-500 text-sm">No vitals recorded yet.</div>}
                </div>
            )}

            {/* CALL HISTORY TAB */}
            {activeTab === 'history' && (
                <GlassCard className="overflow-hidden border-white/5">
                    <table className="w-full">
                        <thead><tr className="border-b border-white/5">
                            {['Call ID', 'Diagnosis', 'Severity', 'Confidence', 'State', 'Date'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em]">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {calls.map((c, i) => {
                                const sevColor = c.severity === 'CRITICAL' ? 'text-danger bg-danger/20 border-danger/30' : c.severity === 'ELEVATED' ? 'text-warning bg-warning/20 border-warning/30' : 'text-success bg-success/20 border-success/30';
                                return (
                                    <motion.tr key={c.call_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                        className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                                        <td className="px-4 py-3 text-[10px] font-mono text-accent-cyan">#{c.call_id}</td>
                                        <td className="px-4 py-3 text-xs text-white font-bold">{c.diagnosis_given || <span className="text-gray-500 italic">Pending</span>}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${sevColor}`}>{c.severity}</span></td>
                                        <td className="px-4 py-3 text-xs font-mono text-gray-400">{c.confidence_score ? `${(c.confidence_score * 100).toFixed(0)}%` : '—'}</td>
                                        <td className="px-4 py-3"><span className={`text-[9px] font-mono uppercase ${c.state === 'active' ? 'text-accent-magenta' : 'text-gray-500'}`}>{c.state}</span></td>
                                        <td className="px-4 py-3 text-[10px] font-mono text-gray-500">{new Date(c.start_time).toLocaleDateString()}</td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {calls.length === 0 && <div className="py-12 text-center text-gray-500 text-sm">No call history.</div>}
                </GlassCard>
            )}

            {/* CLINICAL NOTES TAB */}
            {activeTab === 'notes' && (
                <div className="space-y-4">
                    {/* Add note */}
                    <GlassCard className="p-4 border-accent-blue/20">
                        <div className="flex gap-3">
                            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={2} placeholder="Add clinical note..."
                                className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-accent-blue/50 resize-none font-mono" />
                            <button onClick={handleAddNote} className="px-4 rounded-lg bg-accent-blue/20 border border-accent-blue/40 text-accent-blue hover:bg-accent-blue/30 transition-all">
                                <Send size={18} />
                            </button>
                        </div>
                    </GlassCard>
                    {/* Notes list */}
                    {notes.map((note: any, i: number) => (
                        <motion.div key={note.id || i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                            <GlassCard className="p-4 border-white/5">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <FileText size={14} className="text-accent-purple" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-white leading-relaxed">{note.content}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[9px] font-mono text-gray-500">{note.doctor_name || 'You'}</span>
                                            <span className="text-[9px] font-mono text-gray-600">{note.created_at ? new Date(note.created_at).toLocaleString() : ''}</span>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                    {notes.length === 0 && <div className="py-12 text-center text-gray-500 text-sm">No clinical notes yet.</div>}
                </div>
            )}

            {/* AI PREDICTION TAB */}
            {activeTab === 'predict' && (
                <div className="space-y-6">
                    {!prediction ? (
                        <div className="py-16 text-center">
                            <Brain size={48} className="text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500 mb-4">AI prediction engine is analyzing patient data...</p>
                            <div className="w-8 h-8 border-2 border-accent-purple/20 border-t-accent-purple rounded-full animate-spin mx-auto" />
                        </div>
                    ) : (
                        <>
                            {/* Risk Score */}
                            <GlassCard className={`p-6 ${prediction.risk_level === 'HIGH' ? 'border-danger/30' : prediction.risk_level === 'MODERATE' ? 'border-warning/30' : 'border-success/30'}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-2">AI Risk Assessment</p>
                                        <div className="flex items-baseline gap-3">
                                            <span className={`text-5xl font-black ${prediction.risk_level === 'HIGH' ? 'text-danger' : prediction.risk_level === 'MODERATE' ? 'text-warning' : 'text-success'}`}>
                                                {prediction.risk_score}
                                            </span>
                                            <span className="text-lg font-bold text-gray-400">/ 100</span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider mt-2 ${prediction.risk_level === 'HIGH' ? 'bg-danger/20 text-danger border border-danger/30' : prediction.risk_level === 'MODERATE' ? 'bg-warning/20 text-warning border border-warning/30' : 'bg-success/20 text-success border border-success/30'}`}>
                                            {prediction.risk_level === 'HIGH' ? <AlertTriangle size={10} /> : <TrendingUp size={10} />}
                                            {prediction.risk_level} RISK
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Trend</p>
                                        <div className="flex items-center gap-1">
                                            {prediction.trend === 'improving' ? <TrendingDown size={16} className="text-success" /> : prediction.trend === 'declining' ? <TrendingUp size={16} className="text-danger" /> : <Activity size={16} className="text-gray-400" />}
                                            <span className={`text-sm font-bold uppercase ${prediction.trend === 'improving' ? 'text-success' : prediction.trend === 'declining' ? 'text-danger' : 'text-gray-400'}`}>
                                                {prediction.trend}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>

                            {/* Predictions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <GlassCard className="p-6 border-white/5">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Brain className="text-accent-purple" size={16} /> Condition Predictions
                                    </h3>
                                    <div className="space-y-3">
                                        {prediction.predictions.map((p, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-white">{p.condition}</p>
                                                    <p className="text-[9px] font-mono text-gray-500">{p.timeframe}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${p.probability * 100}%` }}
                                                            className={`h-full rounded-full ${p.probability > 0.7 ? 'bg-danger' : p.probability > 0.4 ? 'bg-warning' : 'bg-success'}`} />
                                                    </div>
                                                    <span className={`text-[10px] font-bold font-mono ${p.probability > 0.7 ? 'text-danger' : p.probability > 0.4 ? 'text-warning' : 'text-success'}`}>
                                                        {(p.probability * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>

                                <GlassCard className="p-6 border-white/5">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Pill className="text-success" size={16} /> AI Recommendations
                                    </h3>
                                    <div className="space-y-2">
                                        {prediction.recommendations.map((rec, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <ChevronRight size={12} className="text-success mt-0.5 shrink-0" />
                                                <p className="text-xs text-gray-300 leading-relaxed">{rec}</p>
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

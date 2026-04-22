'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';
import {
    HeartPulse, Activity, Droplets, Thermometer, Wind, Plus,
    TrendingUp, TrendingDown, Clock, Save, RefreshCcw, Brain,
    AlertTriangle, CheckCircle
} from 'lucide-react';

interface VitalEntry {
    id: number; heart_rate: number | null; systolic_bp: number | null; diastolic_bp: number | null;
    spo2: number | null; temperature: number | null; respiratory_rate: number | null;
    blood_glucose: number | null; weight_kg: number | null;
    source: string; notes: string | null; recorded_at: string;
}

interface Prediction {
    risk_level: string; risk_score: number;
    predictions: { condition: string; probability: number; timeframe: string }[];
    recommendations: string[];
    trend: string;
}

export default function VitalsPage() {
    const [vitals, setVitals] = useState<VitalEntry[]>([]);
    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Form
    const [form, setForm] = useState({
        heart_rate: '', systolic_bp: '', diastolic_bp: '',
        spo2: '', temperature: '', respiratory_rate: '',
        blood_glucose: '', weight_kg: '', notes: ''
    });

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

    const fetchData = useCallback(async () => {
        try {
            const [vitalsRes, predRes] = await Promise.all([
                fetch('/api/org/vitals/history?limit=30', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/ai/predict/me', { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            if (vitalsRes.ok) setVitals(await vitalsRes.json());
            if (predRes.ok) setPrediction(await predRes.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const body: any = {};
        if (form.heart_rate) body.heart_rate = parseInt(form.heart_rate);
        if (form.systolic_bp) body.systolic_bp = parseInt(form.systolic_bp);
        if (form.diastolic_bp) body.diastolic_bp = parseInt(form.diastolic_bp);
        if (form.spo2) body.spo2 = parseFloat(form.spo2);
        if (form.temperature) body.temperature = parseFloat(form.temperature);
        if (form.respiratory_rate) body.respiratory_rate = parseInt(form.respiratory_rate);
        if (form.blood_glucose) body.blood_glucose = parseFloat(form.blood_glucose);
        if (form.weight_kg) body.weight_kg = parseFloat(form.weight_kg);
        if (form.notes) body.notes = form.notes;
        body.source = 'manual';

        try {
            const res = await fetch('/api/org/vitals', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
                setForm({ heart_rate: '', systolic_bp: '', diastolic_bp: '', spo2: '', temperature: '', respiratory_rate: '', blood_glucose: '', weight_kg: '', notes: '' });
                setShowAdd(false);
                fetchData();
            }
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const vitalStatus = (val: number | null, low: number, high: number) => {
        if (val === null) return { color: 'text-gray-500', bg: 'bg-white/5', status: 'N/A', icon: null };
        if (val < low) return { color: 'text-accent-blue', bg: 'bg-accent-blue/10', status: 'LOW', icon: TrendingDown };
        if (val > high) return { color: 'text-danger', bg: 'bg-danger/10', status: 'HIGH', icon: AlertTriangle };
        return { color: 'text-success', bg: 'bg-success/10', status: 'NORMAL', icon: CheckCircle };
    };

    if (loading) {
        return <div className="flex items-center justify-center h-[60vh]"><div className="w-12 h-12 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" /></div>;
    }

    const latest = vitals[0];

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <SplitText text="MY_VITALS" className="text-2xl font-black text-white tracking-[0.15em]" />
                    <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-[0.2em]">Real-time health telemetry &amp; AI forecasting</p>
                </div>
                <div className="flex gap-2">
                    <GlassButton onClick={() => setShowAdd(!showAdd)} className="gap-2">
                        <Plus size={16} /> Record Vitals
                    </GlassButton>
                    <GlassButton onClick={fetchData} className="!p-3">
                        <RefreshCcw size={16} className="text-accent-cyan" />
                    </GlassButton>
                </div>
            </div>

            {/* Live Vitals Cards */}
            {latest && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Heart Rate', value: latest.heart_rate, unit: 'bpm', icon: HeartPulse, ...vitalStatus(latest.heart_rate, 60, 100) },
                        { label: 'Blood Pressure', value: latest.systolic_bp && latest.diastolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp}` : null, unit: 'mmHg', icon: Activity, ...vitalStatus(latest.systolic_bp, 90, 140) },
                        { label: 'SpO2', value: latest.spo2, unit: '%', icon: Wind, ...vitalStatus(latest.spo2, 95, 101) },
                        { label: 'Temperature', value: latest.temperature, unit: '°C', icon: Thermometer, ...vitalStatus(latest.temperature, 36.1, 37.5) },
                    ].map((v, i) => (
                        <BlurIn key={i} delay={i * 0.1}>
                            <GlassCard className={`p-5 border-white/5 ${v.bg} hover:border-white/10 transition-all`}>
                                <div className="flex items-center justify-between mb-3">
                                    <v.icon size={20} className={v.color} />
                                    {v.icon && v.status !== 'N/A' && (
                                        <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-wider ${v.color} ${v.bg} border border-current/20`}>{v.status}</span>
                                    )}
                                </div>
                                <p className={`text-3xl font-black ${v.color} leading-none`}>{v.value ?? '—'}</p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[8px] font-mono text-gray-500 uppercase">{v.label}</span>
                                    <span className="text-[8px] font-mono text-gray-600">{v.unit}</span>
                                </div>
                            </GlassCard>
                        </BlurIn>
                    ))}
                </div>
            )}

            {/* AI Health Forecast */}
            {prediction && (
                <BlurIn delay={0.3}>
                    <GlassCard className={`p-6 ${prediction.risk_level === 'HIGH' ? 'border-danger/30 bg-danger/5' : prediction.risk_level === 'MODERATE' ? 'border-warning/30 bg-warning/5' : 'border-success/30 bg-success/5'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <Brain size={20} className="text-accent-purple" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">AI Health Forecast</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-[9px] font-mono text-gray-500 uppercase mb-1">Risk Score</p>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-4xl font-black ${prediction.risk_level === 'HIGH' ? 'text-danger' : prediction.risk_level === 'MODERATE' ? 'text-warning' : 'text-success'}`}>
                                        {prediction.risk_score}
                                    </span>
                                    <span className="text-sm text-gray-500">/ 100</span>
                                </div>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase ${prediction.risk_level === 'HIGH' ? 'bg-danger/20 text-danger' : prediction.risk_level === 'MODERATE' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                                    {prediction.risk_level}
                                </span>
                            </div>
                            <div>
                                <p className="text-[9px] font-mono text-gray-500 uppercase mb-2">Watch For</p>
                                <div className="space-y-1">
                                    {prediction.predictions.slice(0, 3).map((p, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <span className="text-[10px] text-white">{p.condition}</span>
                                            <span className={`text-[9px] font-mono font-bold ${p.probability > 0.5 ? 'text-danger' : 'text-gray-400'}`}>{(p.probability * 100).toFixed(0)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-mono text-gray-500 uppercase mb-2">Recommendations</p>
                                <div className="space-y-1">
                                    {prediction.recommendations.slice(0, 3).map((r, i) => (
                                        <p key={i} className="text-[10px] text-gray-300 flex items-start gap-1">
                                            <CheckCircle size={10} className="text-success mt-0.5 shrink-0" /> {r}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </BlurIn>
            )}

            {/* Record Vitals Form */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <GlassCard className="p-8 border-accent-cyan/30">
                            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                                <HeartPulse className="text-accent-cyan" /> Record New Vitals
                            </h2>
                            <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { key: 'heart_rate', label: 'Heart Rate (bpm)', placeholder: '72' },
                                    { key: 'systolic_bp', label: 'Systolic BP', placeholder: '120' },
                                    { key: 'diastolic_bp', label: 'Diastolic BP', placeholder: '80' },
                                    { key: 'spo2', label: 'SpO2 (%)', placeholder: '98' },
                                    { key: 'temperature', label: 'Temp (°C)', placeholder: '36.6' },
                                    { key: 'respiratory_rate', label: 'Resp Rate', placeholder: '16' },
                                    { key: 'blood_glucose', label: 'Glucose (mg/dL)', placeholder: '95' },
                                    { key: 'weight_kg', label: 'Weight (kg)', placeholder: '70' },
                                ].map(field => (
                                    <div key={field.key}>
                                        <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">{field.label}</label>
                                        <input type="number" step="any" value={(form as any)[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                                            placeholder={field.placeholder}
                                            className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-accent-cyan/50 transition-all font-mono" />
                                    </div>
                                ))}
                                <div className="col-span-2 md:col-span-3">
                                    <label className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Notes</label>
                                    <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..."
                                        className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-3 text-white text-sm focus:outline-none focus:border-accent-cyan/50 transition-all font-mono" />
                                </div>
                                <div className="flex items-end">
                                    <button type="submit" disabled={saving}
                                        className="w-full py-3 rounded-lg bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan text-xs font-bold uppercase hover:bg-accent-cyan/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                        {saving ? <RefreshCcw size={14} className="animate-spin" /> : saved ? <><CheckCircle size={14} /> Saved!</> : <><Save size={14} /> Record</>}
                                    </button>
                                </div>
                            </form>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Heart Rate Trend Chart */}
            {vitals.length > 2 && (
                <GlassCard className="p-6 border-white/5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        <TrendingUp className="text-accent-cyan" size={16} /> Heart Rate Trend
                    </h3>
                    <div className="h-32 flex items-end gap-1">
                        {vitals.slice(0, 20).reverse().map((v, i) => {
                            const hr = v.heart_rate || 0;
                            const maxHr = Math.max(...vitals.slice(0, 20).map(x => x.heart_rate || 0), 1);
                            return (
                                <motion.div key={v.id} initial={{ height: 0 }} animate={{ height: `${(hr / maxHr) * 100}%` }}
                                    transition={{ delay: i * 0.03 }}
                                    className={`flex-1 rounded-t-sm min-h-[2px] group relative cursor-pointer ${hr > 100 ? 'bg-danger/70' : hr < 60 ? 'bg-accent-blue/70' : 'bg-accent-cyan/70'}`}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 border border-white/10 text-[8px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {hr} bpm
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </GlassCard>
            )}

            {/* Vitals History */}
            <GlassCard className="p-4 border-white/5">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock className="text-gray-400" size={16} /> Recent Readings
                </h3>
                <div className="space-y-2">
                    {vitals.slice(0, 10).map((v, i) => (
                        <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                            className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/5">
                            <div className="grid grid-cols-4 md:grid-cols-7 gap-3 flex-1">
                                <div><span className="text-[7px] text-gray-600 uppercase block">HR</span><span className="text-xs font-bold text-white">{v.heart_rate ?? '—'}</span></div>
                                <div><span className="text-[7px] text-gray-600 uppercase block">BP</span><span className="text-xs font-bold text-white">{v.systolic_bp ?? '—'}/{v.diastolic_bp ?? '—'}</span></div>
                                <div><span className="text-[7px] text-gray-600 uppercase block">SpO2</span><span className="text-xs font-bold text-white">{v.spo2 ?? '—'}%</span></div>
                                <div><span className="text-[7px] text-gray-600 uppercase block">Temp</span><span className="text-xs font-bold text-white">{v.temperature ?? '—'}°</span></div>
                                <div className="hidden md:block"><span className="text-[7px] text-gray-600 uppercase block">Resp</span><span className="text-xs font-bold text-white">{v.respiratory_rate ?? '—'}</span></div>
                                <div className="hidden md:block"><span className="text-[7px] text-gray-600 uppercase block">Glucose</span><span className="text-xs font-bold text-white">{v.blood_glucose ?? '—'}</span></div>
                                <div className="hidden md:block"><span className="text-[7px] text-gray-600 uppercase block">Weight</span><span className="text-xs font-bold text-white">{v.weight_kg ?? '—'}</span></div>
                            </div>
                            <span className="text-[8px] font-mono text-gray-600 shrink-0">{new Date(v.recorded_at).toLocaleDateString()}</span>
                        </motion.div>
                    ))}
                </div>
                {vitals.length === 0 && <div className="py-8 text-center text-gray-500 text-sm">No vitals recorded yet. Click "Record Vitals" to start.</div>}
            </GlassCard>
        </div>
    );
}

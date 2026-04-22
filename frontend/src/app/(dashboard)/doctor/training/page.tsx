'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import {
    GraduationCap, Plus, Brain, ChevronRight, Users, BarChart3,
    Edit3, Archive, X, Save, Activity, Target, TrendingUp,
    Stethoscope, AlertTriangle, CheckCircle2, Flame, Zap
} from 'lucide-react';

interface Scenario {
    id: number;
    title: string;
    difficulty: string;
    patient_personality: string;
    category: string;
    initial_symptoms: string | null;
    expert_diagnosis: string | null;
    expert_action_plan: any[] | null;
    created_by: number | null;
    is_active: boolean;
    created_at: string | null;
}

interface ScenarioStat {
    id: number;
    title: string;
    difficulty: string;
    category: string;
    is_active: boolean;
    author: string;
    total_attempts: number;
    avg_score: number;
}

interface InternData {
    intern_id: number;
    intern_name: string;
    specialty: string;
    total_simulations: number;
    avg_score: number;
    avg_alignment: number;
    best_score: number;
    recent_reports: any[];
}

const CATEGORIES = [
    'General Medicine', 'Cardiology', 'Neurology', 'Emergency Medicine',
    'Pediatrics', 'Pulmonology', 'Allergy & Immunology', 'Urology',
    'Internal Medicine', 'Orthopedics', 'Dermatology', 'Psychiatry'
];

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const difficultyColor: Record<string, string> = {
    beginner: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
    intermediate: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
    advanced: 'border-rose-500/50 text-rose-400 bg-rose-500/10',
};

const difficultyIcon: Record<string, React.ReactNode> = {
    beginner: <CheckCircle2 size={14} />,
    intermediate: <Flame size={14} />,
    advanced: <Zap size={14} />,
};

export default function DoctorTrainingLabPage() {
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [scenarioStats, setScenarioStats] = useState<ScenarioStat[]>([]);
    const [interns, setInterns] = useState<InternData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'scenarios' | 'performance'>('scenarios');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

    // Create form state
    const [form, setForm] = useState({
        title: '',
        difficulty: 'intermediate',
        patient_personality: 'distressed',
        category: 'General Medicine',
        initial_symptoms: '',
        expert_diagnosis: '',
        action_steps: [{ action: '', description: '' }],
    });

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchData = async () => {
        try {
            const [scenariosRes, perfRes] = await Promise.all([
                fetch('/api/hospital/training/scenarios', { headers }),
                fetch('/api/hospital/training/intern-performance', { headers }),
            ]);

            if (scenariosRes.ok) {
                const data = await scenariosRes.json();
                setScenarios(data);
            }
            if (perfRes.ok) {
                const data = await perfRes.json();
                setInterns(data.interns || []);
                setScenarioStats(data.scenarios || []);
            }
        } catch (err) {
            console.error('Failed to fetch training data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const resetForm = () => {
        setForm({
            title: '',
            difficulty: 'intermediate',
            patient_personality: 'distressed',
            category: 'General Medicine',
            initial_symptoms: '',
            expert_diagnosis: '',
            action_steps: [{ action: '', description: '' }],
        });
    };

    const handleCreate = async () => {
        const payload = {
            title: form.title,
            difficulty: form.difficulty,
            patient_personality: form.patient_personality,
            category: form.category,
            initial_symptoms: form.initial_symptoms,
            expert_diagnosis: form.expert_diagnosis,
            expert_action_plan: form.action_steps.filter(s => s.action).map((s, i) => ({
                timestamp: (i + 1) * 15,
                action: s.action,
                description: s.description,
            })),
        };

        try {
            const res = await fetch('/api/hospital/training/scenarios', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setShowCreateModal(false);
                resetForm();
                fetchData();
            }
        } catch (err) {
            console.error('Create failed:', err);
        }
    };

    const handleUpdate = async () => {
        if (!editingScenario) return;
        const payload = {
            title: form.title,
            difficulty: form.difficulty,
            patient_personality: form.patient_personality,
            category: form.category,
            initial_symptoms: form.initial_symptoms,
            expert_diagnosis: form.expert_diagnosis,
            expert_action_plan: form.action_steps.filter(s => s.action).map((s, i) => ({
                timestamp: (i + 1) * 15,
                action: s.action,
                description: s.description,
            })),
        };

        try {
            const res = await fetch(`/api/hospital/training/scenarios/${editingScenario.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setEditingScenario(null);
                resetForm();
                fetchData();
            }
        } catch (err) {
            console.error('Update failed:', err);
        }
    };

    const handleArchive = async (id: number) => {
        try {
            await fetch(`/api/hospital/training/scenarios/${id}`, {
                method: 'DELETE',
                headers,
            });
            fetchData();
        } catch (err) {
            console.error('Archive failed:', err);
        }
    };

    const openEdit = (scenario: Scenario) => {
        setForm({
            title: scenario.title,
            difficulty: scenario.difficulty,
            patient_personality: scenario.patient_personality,
            category: scenario.category || 'General Medicine',
            initial_symptoms: scenario.initial_symptoms || '',
            expert_diagnosis: scenario.expert_diagnosis || '',
            action_steps: (scenario.expert_action_plan || []).map((a: any) => ({
                action: a.action || '',
                description: a.description || '',
            })),
        });
        setEditingScenario(scenario);
    };

    const addActionStep = () => {
        setForm(prev => ({
            ...prev,
            action_steps: [...prev.action_steps, { action: '', description: '' }],
        }));
    };

    const removeActionStep = (index: number) => {
        setForm(prev => ({
            ...prev,
            action_steps: prev.action_steps.filter((_, i) => i !== index),
        }));
    };

    const updateActionStep = (index: number, field: 'action' | 'description', value: string) => {
        setForm(prev => ({
            ...prev,
            action_steps: prev.action_steps.map((s, i) =>
                i === index ? { ...s, [field]: value } : s
            ),
        }));
    };

    // ────── Stats Cards ──────
    const totalActive = scenarios.filter(s => s.is_active).length;
    const totalInterns = interns.length;
    const totalAttempts = scenarioStats.reduce((acc, s) => acc + s.total_attempts, 0);
    const avgOrgScore = scenarioStats.length > 0
        ? Math.round(scenarioStats.reduce((acc, s) => acc + s.avg_score, 0) / scenarioStats.length)
        : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em]">Loading Training Lab...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 pb-20">
            {/* ────── HEADER ────── */}
            <header className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-black text-white tracking-[0.2em] uppercase flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-purple/30 to-accent-cyan/30 flex items-center justify-center border border-white/10">
                            <GraduationCap size={24} className="text-accent-cyan" />
                        </div>
                        Training Lab
                    </h1>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] ml-16">
                        Author_Ghost_Scenarios // Monitor_Intern_Evolution
                    </p>
                </div>
                <GlassButton onClick={() => { resetForm(); setShowCreateModal(true); }} className="gap-2 px-6">
                    <Plus size={16} /> Create Scenario
                </GlassButton>
            </header>

            {/* ────── STATS ROW ────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Scenarios', value: totalActive, icon: <Brain size={18} />, color: 'text-accent-cyan' },
                    { label: 'Interns Training', value: totalInterns, icon: <Users size={18} />, color: 'text-accent-purple' },
                    { label: 'Total Attempts', value: totalAttempts, icon: <Target size={18} />, color: 'text-amber-400' },
                    { label: 'Avg Org Score', value: `${avgOrgScore}%`, icon: <TrendingUp size={18} />, color: 'text-emerald-400' },
                ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                        <GlassCard className="p-5 flex items-center gap-4 border-white/5">
                            <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>{stat.icon}</div>
                            <div>
                                <p className="text-2xl font-black text-white">{stat.value}</p>
                                <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{stat.label}</p>
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>

            {/* ────── TAB SWITCHER ────── */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit border border-white/5">
                {(['scenarios', 'performance'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                            activeTab === tab
                                ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                                : 'text-white/40 hover:text-white/60 border border-transparent'
                        }`}
                    >
                        {tab === 'scenarios' ? '📋 Scenario Library' : '📊 Intern Performance'}
                    </button>
                ))}
            </div>

            {/* ────── SCENARIOS TAB ────── */}
            {activeTab === 'scenarios' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scenarios.map((s, idx) => (
                        <motion.div
                            key={s.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <GlassCard className={`group p-6 flex flex-col gap-4 border-white/5 hover:border-accent-cyan/20 transition-all duration-500 ${!s.is_active ? 'opacity-40 grayscale' : ''}`}>
                                {/* Title Row */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-widest flex items-center gap-1 ${difficultyColor[s.difficulty] || difficultyColor.intermediate}`}>
                                                {difficultyIcon[s.difficulty]} {s.difficulty}
                                            </span>
                                            <span className="text-[8px] font-mono text-white/20 px-2 py-0.5 rounded border border-white/5 uppercase">
                                                {s.category || 'General'}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-bold text-white leading-tight">{s.title}</h3>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-accent-cyan/10 text-accent-cyan group-hover:bg-accent-cyan group-hover:text-black transition-all duration-500">
                                        <Brain size={20} />
                                    </div>
                                </div>

                                {/* Symptoms Preview */}
                                {s.initial_symptoms && (
                                    <p className="text-xs text-white/40 leading-relaxed line-clamp-2 italic">
                                        &quot;{s.initial_symptoms}&quot;
                                    </p>
                                )}

                                {/* Personality */}
                                <div className="flex items-center gap-2">
                                    <Stethoscope size={12} className="text-accent-purple" />
                                    <span className="text-[9px] font-mono text-accent-purple uppercase tracking-widest">
                                        Patient: {s.patient_personality}
                                    </span>
                                </div>

                                {/* Action Plan Count */}
                                <div className="flex items-center gap-2 text-[9px] font-mono text-white/20">
                                    <Activity size={12} />
                                    {(s.expert_action_plan || []).length} Expert Decision Points
                                </div>

                                {/* Stats from scenarioStats */}
                                {(() => {
                                    const stat = scenarioStats.find(st => st.id === s.id);
                                    return stat ? (
                                        <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-1.5">
                                                <Users size={12} className="text-white/20" />
                                                <span className="text-[9px] text-white/30">{stat.total_attempts} attempts</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <BarChart3 size={12} className="text-white/20" />
                                                <span className="text-[9px] text-white/30">Avg: {stat.avg_score}%</span>
                                            </div>
                                            <span className="text-[8px] text-white/15 ml-auto">by {stat.author}</span>
                                        </div>
                                    ) : null;
                                })()}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => openEdit(s)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold text-white/50 uppercase tracking-widest hover:bg-accent-cyan/10 hover:text-accent-cyan hover:border-accent-cyan/20 transition-all"
                                    >
                                        <Edit3 size={12} /> Edit
                                    </button>
                                    {s.is_active && (
                                        <button
                                            onClick={() => handleArchive(s.id)}
                                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold text-white/50 uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all"
                                        >
                                            <Archive size={12} />
                                        </button>
                                    )}
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ────── PERFORMANCE TAB ────── */}
            {activeTab === 'performance' && (
                <div className="space-y-8">
                    {interns.length === 0 ? (
                        <GlassCard className="p-16 text-center border-white/5">
                            <Users size={48} className="mx-auto mb-4 text-white/10" />
                            <h3 className="text-xl font-bold text-white/60 mb-2">No Interns Found</h3>
                            <p className="text-sm text-white/30">No intern-tier doctors are registered in your organization yet.</p>
                        </GlassCard>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {interns.map((intern, idx) => (
                                <motion.div
                                    key={intern.intern_id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.08 }}
                                >
                                    <GlassCard className="p-6 border-white/5 hover:border-accent-purple/20 transition-all">
                                        {/* Intern Header */}
                                        <div className="flex items-center justify-between mb-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-cyan/20 flex items-center justify-center border border-white/10 text-lg font-black text-white">
                                                    {intern.intern_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-white">{intern.intern_name}</h3>
                                                    <p className="text-[9px] font-mono text-accent-purple uppercase tracking-widest">{intern.specialty}</p>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                                                intern.avg_score >= 75 ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' :
                                                intern.avg_score >= 50 ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' :
                                                'border-rose-500/40 text-rose-400 bg-rose-500/10'
                                            }`}>
                                                {intern.avg_score >= 75 ? 'Proficient' : intern.avg_score >= 50 ? 'Developing' : 'Needs Work'}
                                            </div>
                                        </div>

                                        {/* Metric Grid */}
                                        <div className="grid grid-cols-4 gap-3 mb-5">
                                            {[
                                                { label: 'Sims', value: intern.total_simulations },
                                                { label: 'Avg Score', value: `${intern.avg_score}%` },
                                                { label: 'Alignment', value: `${intern.avg_alignment}%` },
                                                { label: 'Best', value: `${intern.best_score}%` },
                                            ].map(m => (
                                                <div key={m.label} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                                    <p className="text-lg font-black text-white">{m.value}</p>
                                                    <p className="text-[7px] font-mono text-white/25 uppercase tracking-widest">{m.label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Recent Reports */}
                                        {intern.recent_reports.length > 0 && (
                                            <div>
                                                <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest mb-3">Recent Reports</p>
                                                <div className="space-y-2">
                                                    {intern.recent_reports.slice(0, 3).map((r: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                                            <span className="text-xs text-white/50 truncate max-w-[60%]">{r.feedback || 'No feedback'}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-xs font-bold ${r.score >= 70 ? 'text-emerald-400' : r.score >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                                    {r.score}%
                                                                </span>
                                                                <span className="text-[8px] text-white/20">
                                                                    {new Date(r.date).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </GlassCard>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ────── CREATE / EDIT MODAL ────── */}
            <AnimatePresence>
                {(showCreateModal || editingScenario) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => { setShowCreateModal(false); setEditingScenario(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 40 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-[#0a0a0f] border border-white/10 shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl rounded-t-3xl">
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-widest">
                                        {editingScenario ? 'Edit Scenario' : 'Create Scenario'}
                                    </h2>
                                    <p className="text-[9px] font-mono text-accent-cyan uppercase tracking-[0.2em] mt-1">
                                        {editingScenario ? 'Modify_Ghost_Replay_Parameters' : 'Author_New_Ghost_Replay'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setShowCreateModal(false); setEditingScenario(null); }}
                                    className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-rose-400 hover:border-rose-500/20 transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-5">
                                {/* Title */}
                                <div>
                                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-2">Scenario Title</label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="e.g., Diabetic Emergency — Case #501"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-accent-cyan/40 transition-colors placeholder:text-white/15"
                                    />
                                </div>

                                {/* Difficulty + Category Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-2">Difficulty</label>
                                        <select
                                            value={form.difficulty}
                                            onChange={(e) => setForm(prev => ({ ...prev, difficulty: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-accent-cyan/40 transition-colors"
                                        >
                                            {DIFFICULTIES.map(d => (
                                                <option key={d} value={d} className="bg-[#0a0a0f]">{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-2">Specialty</label>
                                        <select
                                            value={form.category}
                                            onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-accent-cyan/40 transition-colors"
                                        >
                                            {CATEGORIES.map(c => (
                                                <option key={c} value={c} className="bg-[#0a0a0f]">{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Patient Personality */}
                                <div>
                                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-2">Patient Personality</label>
                                    <input
                                        type="text"
                                        value={form.patient_personality}
                                        onChange={(e) => setForm(prev => ({ ...prev, patient_personality: e.target.value }))}
                                        placeholder="e.g., anxious, panicked, calm, confused"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-accent-cyan/40 transition-colors placeholder:text-white/15"
                                    />
                                </div>

                                {/* Initial Symptoms */}
                                <div>
                                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-2">Initial Patient Complaint</label>
                                    <textarea
                                        value={form.initial_symptoms}
                                        onChange={(e) => setForm(prev => ({ ...prev, initial_symptoms: e.target.value }))}
                                        placeholder="What the patient says when the simulation starts..."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-accent-cyan/40 transition-colors placeholder:text-white/15 resize-none"
                                    />
                                </div>

                                {/* Expert Diagnosis */}
                                <div>
                                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-2">Expert Diagnosis (Gold Standard)</label>
                                    <textarea
                                        value={form.expert_diagnosis}
                                        onChange={(e) => setForm(prev => ({ ...prev, expert_diagnosis: e.target.value }))}
                                        placeholder="The correct diagnosis and clinical reasoning..."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-accent-cyan/40 transition-colors placeholder:text-white/15 resize-none"
                                    />
                                </div>

                                {/* Action Plan Steps */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Expert Action Plan Steps</label>
                                        <button
                                            type="button"
                                            onClick={addActionStep}
                                            className="flex items-center gap-1 text-[9px] font-bold text-accent-cyan uppercase tracking-widest hover:text-accent-cyan/80 transition-colors"
                                        >
                                            <Plus size={12} /> Add Step
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {form.action_steps.map((step, i) => (
                                            <div key={i} className="flex gap-2 items-start">
                                                <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 flex items-center justify-center text-[10px] font-black text-accent-cyan shrink-0 mt-1">
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={step.action}
                                                        onChange={(e) => updateActionStep(i, 'action', e.target.value)}
                                                        placeholder="Action (e.g., Check vitals)"
                                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-accent-cyan/40 transition-colors placeholder:text-white/15"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={step.description}
                                                        onChange={(e) => updateActionStep(i, 'description', e.target.value)}
                                                        placeholder="Description (clinical detail)"
                                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-white/60 text-xs focus:outline-none focus:border-accent-cyan/30 transition-colors placeholder:text-white/10"
                                                    />
                                                </div>
                                                {form.action_steps.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeActionStep(i)}
                                                        className="p-2 mt-1 rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl rounded-b-3xl">
                                <button
                                    onClick={() => { setShowCreateModal(false); setEditingScenario(null); }}
                                    className="px-6 py-2.5 rounded-xl text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white/60 transition-colors"
                                >
                                    Cancel
                                </button>
                                <GlassButton
                                    onClick={editingScenario ? handleUpdate : handleCreate}
                                    className="gap-2 px-8"
                                    disabled={!form.title || !form.expert_diagnosis || !form.initial_symptoms}
                                >
                                    <Save size={14} />
                                    {editingScenario ? 'Save Changes' : 'Create Scenario'}
                                </GlassButton>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

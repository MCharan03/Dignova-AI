'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Brain, GraduationCap, ChevronRight, Activity, Clock, ShieldAlert, History, Send, CheckCircle2 } from 'lucide-react';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';

interface TrainingScenario {
    id: number;
    title: string;
    difficulty: string;
    patient_personality: string;
    initial_symptoms: string;
    expert_diagnosis: string;
    expert_action_plan: any[];
}

export default function InternTrainingPage() {
    const [scenarios, setScenarios] = useState<TrainingScenario[]>([]);
    const [activeScenario, setActiveScenario] = useState<TrainingScenario | null>(null);
    const [loading, setLoading] = useState(true);
    const [diagnosis, setDiagnosis] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        const fetchScenarios = async () => {
            const token = localStorage.getItem('access_token');
            try {
                const res = await fetch('/api/hospital/training/scenarios', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setScenarios(await res.json());
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchScenarios();
    }, []);

    const startGhostReplay = (id: number) => {
        const scenario = scenarios.find(s => s.id === id);
        if (scenario) {
            setActiveScenario(scenario);
            setResult(null);
            setDiagnosis('');
        }
    };

    const handleSubmitDiagnosis = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeScenario) return;
        
        setSubmitting(true);
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`/api/hospital/training/submit/${activeScenario.id}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ diagnosis })
            });
            
            if (res.ok) {
                const data = await res.json();
                setResult(data);
                // The backend triggers n8n Automation 08 automatically here
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (activeScenario) {
        return (
            <div className="flex flex-col gap-8 h-full pb-20">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-accent-cyan/20 flex items-center justify-center border border-accent-cyan/30 animate-pulse">
                            <Activity size={24} className="text-accent-cyan" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-widest uppercase">{activeScenario.title}</h2>
                            <p className="text-[10px] font-mono text-accent-cyan uppercase tracking-[0.2em]">Neural_Link_Active // Ghost_Simulation_Mode</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setActiveScenario(null)}
                        className="text-[10px] font-bold tracking-[0.2em] text-white/40 hover:text-rose-500 transition-colors border border-white/10 px-6 py-2.5 rounded-full uppercase bg-white/5"
                    >
                        Terminate Simulation
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                    {/* Left: Ghost Feed */}
                    <div className="lg:col-span-2 space-y-8">
                        <GlassCard className="flex flex-col gap-6 border-white/5 bg-black/40 min-h-[300px]">
                            <div className="p-8 space-y-6">
                                <div className="flex items-center gap-3 text-accent-cyan border-b border-white/5 pb-4">
                                    <ShieldAlert size={18} />
                                    <span className="text-xs font-bold uppercase tracking-widest">Initial Sequence Log</span>
                                </div>
                                <p className="text-lg text-white font-light italic leading-relaxed uppercase">
                                    &quot;{activeScenario.initial_symptoms}&quot;
                                </p>
                            </div>
                        </GlassCard>

                        {result ? (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                <GlassCard className="p-8 border-success/30 bg-success/5 text-center">
                                    <CheckCircle2 className="mx-auto mb-4 text-success" size={48} />
                                    <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Simulation Evaluated</h3>
                                    <p className="text-gray-400 mb-6">A performance dossier has been dispatched to your Neural Link (Telegram).</p>
                                    <div className="inline-block px-8 py-3 rounded-full bg-success/20 border border-success/40 text-success font-black tracking-widest">
                                        ALIGNMENT: {result.alignment_with_expert}%
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ) : (
                            <GlassCard className="p-8 border-white/5 bg-white/[0.02]">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Enter Diagnostic Assessment</h3>
                                <form onSubmit={handleSubmitDiagnosis} className="space-y-6">
                                    <textarea 
                                        value={diagnosis}
                                        onChange={(e) => setDiagnosis(e.target.value)}
                                        placeholder="Enter your clinical findings and action plan..."
                                        className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-6 text-white font-mono text-sm focus:outline-none focus:border-accent-cyan/50 transition-colors"
                                        required
                                    />
                                    <div className="flex justify-end">
                                        <GlassButton type="submit" disabled={submitting} className="gap-2 px-10">
                                            {submitting ? 'PROCESSING...' : 'SUBMIT_FOR_EVALUATION'} <Send size={16} />
                                        </GlassButton>
                                    </div>
                                </form>
                            </GlassCard>
                        )}
                    </div>

                    {/* Right: Expert Comparison */}
                    <div className="flex flex-col gap-8">
                        <GlassCard className="border-accent-purple/20 bg-accent-purple/5">
                            <h4 className="text-[10px] font-black text-accent-purple uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                <ShieldAlert size={14} /> Expert_Decision_Log
                            </h4>
                            <div className="space-y-6">
                                {(activeScenario.expert_action_plan || []).map((action: any, idx: number) => (
                                    <div key={idx} className={`flex gap-4 transition-all duration-1000 ${result ? 'opacity-100' : 'opacity-20 grayscale blur-[2px]'}`}>
                                        <div className="w-1 h-12 bg-accent-purple/30 rounded-full" />
                                        <div>
                                            <p className="text-[10px] font-mono text-accent-purple uppercase">NODE_POINT</p>
                                            <p className="text-xs text-white/60 font-light italic">{result ? action.description : 'Locked until submission...'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 pb-20">
            <header className="flex flex-col gap-2">
                <h1 className="text-4xl font-black text-white tracking-[0.3em] uppercase">Training Terminal</h1>
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                    <GraduationCap size={14} className="text-accent-cyan" /> Select_Ghost_Scenario // Calibrate_Neural_Triage
                </p>
            </header>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {scenarios.map((s, index) => (
                        <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                            <GlassCard className="group cursor-pointer border-white/5 hover:border-accent-cyan/30 transition-all p-8 bg-white/[0.02]" onClick={() => startGhostReplay(s.id)}>
                                <div className="flex justify-between items-start mb-8">
                                    <div className="p-4 rounded-2xl bg-accent-cyan/10 text-accent-cyan group-hover:bg-accent-cyan group-hover:text-black transition-all duration-500">
                                        <Brain size={28} />
                                    </div>
                                    <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${
                                        s.difficulty === 'advanced' ? 'border-rose-500/50 text-rose-400 bg-rose-500/10' :
                                        s.difficulty === 'intermediate' ? 'border-amber-500/50 text-amber-400 bg-amber-500/10' :
                                        'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                                    }`}>
                                        {s.difficulty}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-accent-cyan transition-colors duration-500 uppercase tracking-tight">{s.title}</h3>
                                <p className="text-xs text-white/30 mb-8 font-light leading-relaxed">
                                    Analyze real-world patient interactions with {s.patient_personality} traits. Align your diagnostics with expert standards.
                                </p>
                                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">
                                        <History size={12} /> ARCHIVE_DATA_NODE
                                    </div>
                                    <div className="flex items-center gap-1 text-accent-cyan text-xs font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                        INITIALIZE <ChevronRight size={14} />
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

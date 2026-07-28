'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
    Brain, GraduationCap, ChevronRight, Activity, ShieldAlert, History, 
    Star, Zap, Target, Filter, Flame, Check, ArrowUpRight, Radio, Trophy, 
    Settings, Play, RotateCcw, Eye, FileText, Send, CheckCircle2
} from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { apiUrl } from '@/lib/api';

interface TrainingScenario { 
    id: number; 
    title: string; 
    difficulty: string; 
    patient_personality: string; 
    category: string; 
    initial_symptoms: string; 
    expert_diagnosis: string; 
    expert_action_plan: any[]; 
}

interface ProgressData { 
    total_simulations: number; 
    avg_score: number; 
    avg_alignment: number; 
    best_score: number; 
    skill_level: string; 
    xp: number; 
    level: number; 
    next_level_xp: number; 
    score_history: Array<{ attempt: number; score: number; alignment: number; date: string; scenario_id: number | null }>; 
    recent_reports: Array<{ id: number; scenario_title: string; difficulty: string; score: number; alignment: number; feedback: string; date: string }>; 
    recommended_difficulty: string; 
    trend: string; 
    scenario_metrics?: Record<string, { attempts: number; success_rate: number; avg_score: number; avg_alignment: number }>;
    streak_days?: number;
    weekly_activity?: Array<{ day: string; date: string; count: number; completed: boolean }>;
}

interface CurrentUser {
    name: string;
    tier?: string;
    specialty?: string;
}

const WEEK_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// Custom SVG Circular Progress Ring
function CircularRing({ percentage, color }: { percentage: number, color: string }) {
    const r = 8;
    const circ = 2 * Math.PI * r;
    const strokeDashoffset = circ - (percentage / 100) * circ;
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" className="rotate-[-90deg]">
            <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
            <motion.circle cx="12" cy="12" r={r} fill="none" stroke={color} strokeWidth="2" strokeDasharray={circ} strokeDashoffset={circ} animate={{ strokeDashoffset }} transition={{ duration: 1, ease: 'easeOut' }} strokeLinecap="round" />
        </svg>
    );
}

// Mini Sparkline SVG
function MiniSparkline({ data, color }: { data: number[], color: string }) {
    if (!data.length) return <div className="h-6" />;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 60},${20 - ((d - min) / range) * 20}`).join(' ');
    return (
        <svg width="60" height="24" viewBox="0 -4 60 28" className="opacity-80">
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            {data.length > 0 && <circle cx="60" cy={20 - ((data[data.length - 1] - min) / range) * 20} r="2" fill={color} />}
        </svg>
    );
}

// Bar Chart SVG
function HistoryBarChart({ data }: { data: number[] }) {
    if (!data.length) return <p className="text-[10px] text-white/40 mt-4">No scored attempts yet.</p>;
    return (
        <div className="flex items-end justify-between h-24 mt-4 relative">
            <div className="absolute inset-0 flex flex-col justify-between text-[8px] font-mono text-white/20 pointer-events-none">
                <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
            </div>
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[...Array(5)].map((_, i) => <div key={i} className="w-full h-[1px] bg-white/5" />)}
            </div>
            <div className="flex items-end justify-between w-full h-full pl-8 z-10">
                {data.map((val, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer">
                        <div className="w-3 rounded-t-sm bg-gradient-to-t from-accent-purple/20 to-accent-purple transition-all group-hover:to-accent-cyan" style={{ height: `${val}%` }} />
                        <span className="text-[8px] font-mono text-white/30">{i + 1}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface CaseStudy {
    id: number;
    title: string;
    symptoms: string;
    diagnostics: string;
    treatment_plan?: string;
    notes?: string;
    created_at: string;
}

export default function InternTrainingPage() {
    const router = useRouter();
    const [scenarios, setScenarios] = useState<TrainingScenario[]>([]);
    const [cases, setCases] = useState<CaseStudy[]>([]);
    const [progress, setProgress] = useState<ProgressData | null>(null);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<string>('training');

    // Simulation States
    const [activeScenario, setActiveScenario] = useState<TrainingScenario | null>(null);
    const [diagnosis, setDiagnosis] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Case Study Form States
    const [showCaseForm, setShowCaseForm] = useState(false);
    const [caseTitle, setCaseTitle] = useState('');
    const [caseSymptoms, setCaseSymptoms] = useState('');
    const [caseDiagnostics, setCaseDiagnostics] = useState('');
    const [casePlan, setCasePlan] = useState('');
    const [caseNotes, setCaseNotes] = useState('');
    const [creatingCase, setCreatingCase] = useState(false);

    // Simulation States
    // ... rest of states ...

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            try {
                const [scenariosRes, progressRes, casesRes] = await Promise.all([
                    fetch(apiUrl('/api/hospital/training/scenarios'), { headers }),
                    fetch(apiUrl('/api/hospital/training/progress'), { headers }),
                    fetch(apiUrl('/api/hospital/cases'), { headers }),
                ]);
                const userRes = await fetch(apiUrl('/api/auth/me'), { headers });

                if (scenariosRes.ok) setScenarios(await scenariosRes.json().catch(() => ({})));
                if (progressRes.ok) setProgress(await progressRes.json().catch(() => ({})));
                if (casesRes.ok) setCases(await casesRes.json().catch(() => ({})));
                if (userRes.ok) setCurrentUser(await userRes.json().catch(() => ({})));
            } catch (error) {
                console.error('Failed to load intern training dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCreateCase = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingCase(true);
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(apiUrl('/api/hospital/cases'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: caseTitle,
                    symptoms: caseSymptoms,
                    diagnostics: caseDiagnostics,
                    treatment_plan: casePlan,
                    notes: caseNotes
                })
            });
            if (res.ok) {
                const newCase = await res.json().catch(() => ({}));
                setCases([newCase, ...cases]);
                setShowCaseForm(false);
                setCaseTitle('');
                setCaseSymptoms('');
                setCaseDiagnostics('');
                setCasePlan('');
                setCaseNotes('');
            }
        } catch (error) {
            console.error('Failed to create case study:', error);
        } finally {
            setCreatingCase(false);
        }
    };

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
            const res = await fetch(apiUrl(`/api/hospital/training/submit/${activeScenario.id}`), {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ diagnosis })
            });
            
            if (res.ok) {
                setResult(await res.json().catch(() => ({})));
                // Refresh progress data
                const progRes = await fetch(apiUrl('/api/hospital/training/progress'), { headers: { Authorization: `Bearer ${token}` } });
                if (progRes.ok) setProgress(await progRes.json().catch(() => ({})));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const difficultyColors: Record<string, string> = {
        beginner: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        intermediate: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        advanced: 'text-rose-400 bg-rose-400/10 border-rose-400/20'
    };

    if (loading) return <div className="flex h-full items-center justify-center"><div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" /></div>;

    const scoreBars = (progress?.score_history || []).slice(-12).map((entry) => Math.round(entry.score));
    const categories = ['all', ...Array.from(new Set(scenarios.map((s) => s.category).filter(Boolean)))];
    
    const currentLevel = progress?.level || 1;
    const filteredScenarios = scenarios.filter((s) => categoryFilter === 'all' || s.category === categoryFilter);

    const xpToNext = progress ? Math.max((progress.level * 100) - progress.xp, 0) : 0;
    const currentLevelStartXp = progress ? Math.max((progress.level - 1) * 100, 0) : 0;
    const levelProgressPct = progress ? Math.max(0, Math.min(100, ((progress.xp - currentLevelStartXp) / 100) * 100)) : 0;

    const getRelativeTime = (dateString: string) => {
        const then = new Date(dateString).getTime();
        if (!then) return '--';
        const diffMs = Date.now() - then;
        const mins = Math.floor(diffMs / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 h-full max-w-[1650px] mx-auto">
            {/* LEFT SIDEBAR */}
            <aside className="lg:col-span-2 hidden lg:flex flex-col gap-4">
                <GlassCard className="p-4 bg-[#0f1320] border-white/10">
                    <p className="text-[11px] font-black tracking-[0.2em] uppercase text-white/90 mb-5">Training</p>
                    <div className="flex flex-col gap-2">
                        {[
                            { id: 'training', label: 'Training', icon: <GraduationCap size={15} /> },
                            { id: 'cases', label: 'Cases', icon: <FileText size={15} /> },
                            { id: 'progress', label: 'Progress', icon: <History size={15} /> },
                            { id: 'monitor', label: 'Live Monitor', icon: <Radio size={15} /> },
                            { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={15} /> }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setActiveScenario(null); }}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-[11px] font-medium transition-all ${
                                    activeTab === item.id && !activeScenario
                                        ? 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan'
                                        : 'bg-white/[0.02] border-white/5 text-white/65 hover:text-white hover:bg-white/[0.06]'
                                }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </GlassCard>

                <GlassCard className="p-4 bg-[#0f1320] border-white/10">
                    <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/70 mb-3">Quick Actions</p>
                    <div className="flex flex-col gap-2">
                        <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-[10px] text-white/70 hover:text-accent-cyan transition-all"><Play size={12} /> Start Random Case</button>
                        <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-[10px] text-white/70 hover:text-accent-cyan transition-all"><RotateCcw size={12} /> Resume Last Case</button>
                    </div>
                </GlassCard>

                <GlassCard className="p-4 bg-[#0f1320] border-white/10 mt-auto">
                    <p className="text-[11px] font-black text-white">{currentUser?.name || 'Intern'}</p>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 mt-1">{currentUser?.specialty || 'General Medicine'}</p>
                </GlassCard>
            </aside>

            <div className="lg:col-span-10 flex flex-col gap-6">
                
                {activeScenario ? (
                    /* SIMULATION VIEW */
                    <div className="flex flex-col gap-8 h-full">
                        <header className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setActiveScenario(null)}
                                    className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all"
                                >
                                    <ChevronRight className="rotate-180" size={20} />
                                </button>
                                <div>
                                    <h1 className="text-2xl font-black text-white uppercase tracking-wider">{activeScenario.title}</h1>
                                    <p className="text-[10px] font-mono text-accent-cyan uppercase tracking-[0.2em]">Live_Simulation // Session_Active</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${difficultyColors[activeScenario.difficulty.toLowerCase()]}`}>
                                    {activeScenario.difficulty.toUpperCase()}
                                </span>
                                <div className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-black animate-pulse">
                                    REC_00:42
                                </div>
                            </div>
                        </header>

                        <div className="grid grid-cols-12 gap-8 flex-1">
                            <div className="col-span-8 flex flex-col gap-6">
                                <GlassCard className="p-8 border-white/10 bg-[#0f1320]">
                                    <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                        <Activity size={14} className="text-accent-cyan" /> Patient_Presentation
                                    </h3>
                                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 mb-8">
                                        <p className="text-white/90 leading-relaxed italic text-lg font-light">
                                            "{activeScenario.initial_symptoms}"
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Diagnostic Verdict</h4>
                                            <span className="text-[9px] font-mono text-white/30 uppercase">Min_100_Characters</span>
                                        </div>
                                        <textarea 
                                            value={diagnosis}
                                            onChange={(e) => setDiagnosis(e.target.value)}
                                            placeholder="Analyze symptoms, provide differential diagnosis, and define immediate action plan..."
                                            className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-6 text-white text-sm focus:border-accent-cyan/50 outline-none transition-all resize-none"
                                        />
                                        <div className="flex justify-end pt-4">
                                            <GlassButton 
                                                onClick={handleSubmitDiagnosis}
                                                disabled={submitting || diagnosis.length < 10}
                                                className="gap-3 px-12"
                                            >
                                                {submitting ? 'CALCULATING...' : 'SUBMIT_FOR_EVALUATION'}
                                                <Send size={14} />
                                            </GlassButton>
                                        </div>
                                    </div>
                                </GlassCard>

                                <AnimatePresence>
                                    {result && (
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                            <GlassCard className="p-8 border-accent-cyan/30 bg-accent-cyan/[0.02]">
                                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-full bg-accent-cyan/10 flex items-center justify-center border border-accent-cyan/20">
                                                            <Trophy className="text-accent-cyan" size={24} />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-black text-white uppercase">Evaluation Complete</h3>
                                                            <p className="text-[10px] font-mono text-white/30 uppercase">Dignova_Expert_Standard_Alignment</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-4xl font-black text-white">{result.score}%</p>
                                                        <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Composite_Score</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-8 mb-8">
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-accent-cyan uppercase tracking-widest mb-3">AI Analysis</h4>
                                                        <p className="text-xs text-white/70 leading-relaxed">{result.feedback}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">Expert Standard</h4>
                                                        <p className="text-xs text-white/70 leading-relaxed italic opacity-60">"{activeScenario.expert_diagnosis}"</p>
                                                    </div>
                                                </div>

                                                <div className="flex justify-center gap-4">
                                                    <GlassButton onClick={() => setActiveScenario(null)} className="px-8 !bg-white !text-black border-none">EXIT_SIMULATION</GlassButton>
                                                    <GlassButton onClick={() => {setResult(null); setDiagnosis('');}} className="px-8 bg-transparent border-white/10">RETRY_CASE</GlassButton>
                                                </div>
                                            </GlassCard>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="col-span-4 flex flex-col gap-6">
                                <GlassCard className="p-6 border-white/5 bg-[#0f1320]">
                                    <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-5">Patient Context</h4>
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                            <p className="text-[9px] font-mono text-accent-cyan uppercase mb-1">Personality</p>
                                            <p className="text-xs text-white font-medium capitalize">{activeScenario.patient_personality}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                            <p className="text-[9px] font-mono text-accent-cyan uppercase mb-1">Specialty</p>
                                            <p className="text-xs text-white font-medium">{activeScenario.category}</p>
                                        </div>
                                    </div>
                                </GlassCard>

                                <GlassCard className="p-6 border-white/5 bg-[#0f1320]">
                                    <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-5">Simulator Status</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-white/40 font-mono">Neural_Engine</span>
                                            <span className="text-emerald-400 font-bold uppercase">Active</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-white/40 font-mono">Telemetry_Sync</span>
                                            <span className="text-emerald-400 font-bold uppercase">Locked</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                                            <motion.div animate={{ x: [-100, 300] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-20 h-full bg-accent-cyan/40 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                                        </div>
                                    </div>
                                </GlassCard>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'cases' ? (
                    /* CASES VIEW */
                    <div className="flex flex-col gap-6">
                        <header className="flex items-center justify-between">
                            <div>
                                <h1 className="text-[28px] font-black text-white tracking-[0.15em] uppercase">Medical Case Studies</h1>
                                <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.1em]">Clinical_Documentation // Intern_Knowledge_Base</p>
                            </div>
                            <GlassButton onClick={() => setShowCaseForm(true)} className="gap-2">
                                <FileText size={14} /> BUILD_NEW_CASE
                            </GlassButton>
                        </header>

                        <AnimatePresence>
                            {showCaseForm && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -20 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, y: -20 }}
                                    className="mb-8"
                                >
                                    <GlassCard className="p-8 border-accent-cyan/20 bg-accent-cyan/[0.02]">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Construct Case Study</h3>
                                            <button onClick={() => setShowCaseForm(false)} className="text-[10px] text-white/40 hover:text-rose-500 uppercase font-bold">Cancel</button>
                                        </div>
                                        <form onSubmit={handleCreateCase} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-2">Case Title</label>
                                                <input 
                                                    value={caseTitle} 
                                                    onChange={(e) => setCaseTitle(e.target.value)}
                                                    placeholder="e.g., Acute Myocardial Infarction - Triage Observation"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 outline-none"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-2">Symptoms</label>
                                                <textarea 
                                                    value={caseSymptoms} 
                                                    onChange={(e) => setCaseSymptoms(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 outline-none h-32"
                                                    placeholder="Describe presenting symptoms..."
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-2">Diagnostics Given</label>
                                                <textarea 
                                                    value={caseDiagnostics} 
                                                    onChange={(e) => setCaseDiagnostics(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 outline-none h-32"
                                                    placeholder="What diagnostics were performed?"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-2">Treatment Plan</label>
                                                <textarea 
                                                    value={casePlan} 
                                                    onChange={(e) => setCasePlan(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 outline-none h-32"
                                                    placeholder="Action plan taken..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest block mb-2">Personal Notes</label>
                                                <textarea 
                                                    value={caseNotes} 
                                                    onChange={(e) => setCaseNotes(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 outline-none h-32"
                                                    placeholder="Learnings or additional context..."
                                                />
                                            </div>
                                            <div className="md:col-span-2 flex justify-end">
                                                <GlassButton type="submit" disabled={creatingCase} className="px-10">
                                                    {creatingCase ? 'COMMITING...' : 'FINALIZE_CASE_STUDY'}
                                                </GlassButton>
                                            </div>
                                        </form>
                                    </GlassCard>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {cases.length === 0 ? (
                                <div className="md:col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                    <p className="text-white/20 text-xs font-mono uppercase tracking-[0.2em]">Repository_Empty // No_Cases_Found</p>
                                </div>
                            ) : (
                                cases.map((c) => (
                                    <GlassCard key={c.id} className="p-6 bg-[#121420] border-white/5 hover:border-accent-cyan/30 transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 flex items-center justify-center border border-accent-cyan/20"><FileText size={16} className="text-accent-cyan" /></div>
                                            <span className="text-[8px] font-mono text-white/30 uppercase">{new Date(c.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-sm font-black text-white uppercase mb-4">{c.title}</h3>
                                        <div className="space-y-4 mb-6">
                                            <div>
                                                <p className="text-[9px] font-mono text-accent-cyan uppercase tracking-widest mb-1">Symptoms</p>
                                                <p className="text-xs text-white/60 line-clamp-2">{c.symptoms}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-mono text-amber-500 uppercase tracking-widest mb-1">Diagnostics</p>
                                                <p className="text-xs text-white/60 line-clamp-2">{c.diagnostics}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end pt-4 border-t border-white/5">
                                            <button className="text-[10px] font-black text-accent-cyan uppercase flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">EXPAND_CASE <ArrowUpRight size={12} /></button>
                                        </div>
                                    </GlassCard>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    /* DASHBOARD VIEW (Training Tab) */
                    <>
                    <header className="flex flex-col gap-1">
                        <h1 className="text-[28px] font-black text-white tracking-[0.15em] uppercase">Training Dashboard</h1>
                        <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.1em]">Ghost Replay Engine // Neural Calibration</p>
                    </header>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <GlassCard className="p-4 border-white/5 bg-[#121420]">
                            <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">Level</p>
                            <p className="text-2xl font-black text-white">{progress?.level || 1}</p>
                            <div className="w-full h-8 mt-2 opacity-50"><MiniSparkline data={(progress?.score_history || []).slice(-7).map((d) => d.score)} color="#f59e0b" /></div>
                        </GlassCard>
                        <GlassCard className="p-4 border-white/5 bg-[#121420]">
                            <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">XP</p>
                            <p className="text-2xl font-black text-white">{progress?.xp || 0}</p>
                            <div className="w-full h-8 mt-2 opacity-50"><MiniSparkline data={(progress?.score_history || []).slice(-7).map((d) => d.alignment)} color="#06b6d4" /></div>
                        </GlassCard>
                        <GlassCard className="p-4 border-white/5 bg-[#121420]">
                            <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">Avg Score</p>
                            <p className="text-2xl font-black text-white">{progress?.avg_score || 0}%</p>
                            <div className="w-full h-8 mt-2 opacity-50"><MiniSparkline data={(progress?.score_history || []).slice(-7).map((d) => d.score)} color="#8B5CF6" /></div>
                        </GlassCard>
                        <GlassCard className="p-4 border-white/5 bg-[#121420]">
                            <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">Skill Level</p>
                            <p className="text-[14px] font-black text-white uppercase">{progress?.skill_level || 'NOVICE'}</p>
                            <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-emerald-400" style={{ width: `${levelProgressPct}%` }} />
                            </div>
                        </GlassCard>
                        <GlassCard className="p-4 border-white/5 bg-[#121420]">
                            <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">Trend</p>
                            <p className="text-[14px] font-black text-white uppercase">{progress?.trend || 'STABLE'}</p>
                            <p className="text-[10px] font-bold text-emerald-400 mt-2">Improving</p>
                        </GlassCard>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        <div className="lg:col-span-8 flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                <button className="text-[11px] font-bold text-accent-cyan tracking-[0.15em] border-b-2 border-accent-cyan pb-2 uppercase">Scenarios</button>
                                <select 
                                    value={categoryFilter} 
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] text-white/80 border border-white/5 focus:outline-none"
                                >
                                    {categories.map(c => <option key={c} value={c} className="bg-[#121420]">{c === 'all' ? 'All Categories' : c}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredScenarios.map((s, i) => {
                                    const stat = progress?.scenario_metrics?.[String(s.id)];
                                    const success = Math.round(stat?.success_rate ?? 0);
                                    return (
                                        <GlassCard 
                                            key={s.id} 
                                            className="p-5 bg-[#121420] border-white/5 hover:border-accent-cyan/50 transition-all cursor-pointer group"
                                            onClick={() => startGhostReplay(s.id)}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 flex items-center justify-center border border-accent-cyan/20"><Brain size={16} className="text-accent-cyan" /></div>
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${difficultyColors[s.difficulty.toLowerCase()] || difficultyColors.beginner}`}>{s.difficulty}</span>
                                            </div>
                                            <h3 className="text-sm font-black text-white uppercase mb-0.5">{s.title}</h3>
                                            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-4">CASE #{s.id}</p>
                                            <p className="text-[10px] text-white/60 mb-5">{s.category} · {s.patient_personality}</p>
                                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-[8px] font-mono text-white/40 uppercase mr-1">Success</p>
                                                    <p className="text-xs font-black text-white">{success}%</p>
                                                    <CircularRing percentage={success} color={success > 70 ? '#10b981' : '#f59e0b'} />
                                                </div>
                                                <p className="text-[10px] font-black text-accent-cyan uppercase flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">START <ChevronRight size={12} /></p>
                                            </div>
                                        </GlassCard>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="lg:col-span-4 flex flex-col gap-4">
                            <GlassCard className="p-5 border-white/5 bg-[#121420]">
                                <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-4">Score History</p>
                                <HistoryBarChart data={scoreBars} />
                            </GlassCard>
                            <GlassCard className="p-5 border-white/5 bg-[#121420]">
                                <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-4">Recent Simulations</p>
                                <div className="flex flex-col gap-3">
                                    {progress?.recent_reports?.slice(0,4).map((r: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold text-white truncate uppercase">{r.scenario_title}</p>
                                                <p className="text-[8px] font-mono text-white/20 uppercase">{getRelativeTime(r.date)}</p>
                                            </div>
                                            <p className="text-[10px] font-black text-emerald-400">{r.score}%</p>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                            <GlassCard className="p-5 border-amber-500/20 bg-gradient-to-br from-[#121420] to-[#1a110a]">
                                <div className="flex items-center gap-2 mb-4">
                                    <Flame size={16} className="text-amber-500" />
                                    <p className="text-[11px] font-black text-amber-500 uppercase">{progress?.streak_days || 0} Day Streak</p>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    {WEEK_DAYS.map((day) => <div key={day} className="w-1.5 h-1.5 rounded-full bg-white/10" />)}
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                    </>
                )}
            </div>
        </div>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Activity, Phone, X, Send, Brain, Award, ShieldAlert, ChevronRight, User, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Case {
    id: number;
    name: string;
    age: number;
    gender: string;
    case_title: string;
    difficulty: string;
    initial_complaint: string;
}

interface SimulationSandboxProps {
    onClose: () => void;
    onComplete: () => void;
}

export function SimulationSandbox({ onClose, onComplete }: SimulationSandboxProps) {
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCalling, setIsCalling] = useState(false);
    const [transcript, setTranscript] = useState<{ role: string, text: string }[]>([]);
    const [evaluating, setEvaluating] = useState(false);
    const [report, setReport] = useState<any>(null);

    // WebSocket state
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    useEffect(() => {
        fetchCases();
    }, []);

    const fetchCases = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch('/api/hospital/training/cases', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setCases(await res.json());
        } catch (err) {
            console.error("Failed to load cases");
        } finally {
            setLoading(false);
        }
    };

    const startSimulation = async (caseId: number) => {
        setIsCalling(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/hospital/training/start/${caseId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const session = await res.json();
                setSessionId(session.id);
                // In a real app, we'd connect to WebSocket here for voice
                // For this "Build Mode" demo, we'll simulate the first patient message
                const c = cases.find(c => c.id === caseId);
                setTranscript([{ role: 'PATIENT', text: c?.initial_complaint || '' }]);
            }
        } catch (err) {
            console.error("Failed to start session");
            setIsCalling(false);
        }
    };

    const endSimulation = async () => {
        setEvaluating(true);
        // Simulate evaluation delay
        setTimeout(() => {
            setReport({
                score: 85,
                feedback: "Strong empathy and systematic questioning. You correctly identified the suspected Myocardial Infarction. However, you missed asking about the duration of the symptoms.",
                missed_red_flags: ["Symptom Duration", "Family History of Cardiac issues"]
            });
            setEvaluating(false);
        }, 2000);
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
                <GlassCard className="h-full flex flex-col !p-0 border-white/10 relative overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-accent-magenta/20 flex items-center justify-center border border-accent-magenta/30">
                                <Brain size={20} className="text-accent-magenta" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">Neural Simulation Sandbox</h3>
                                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Environment: Training_Node_01</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    {!sessionId ? (
                        /* Case Selection */
                        <div className="p-8 overflow-y-auto">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Select Medical Case</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {cases.map((c) => (
                                    <button 
                                        key={c.id}
                                        onClick={() => setSelectedCase(c)}
                                        className={`p-5 rounded-2xl border text-left transition-all group ${selectedCase?.id === c.id ? 'bg-accent-magenta/10 border-accent-magenta/50 shadow-[0_0_20px_rgba(255,0,255,0.1)]' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border ${c.difficulty === 'Beginner' ? 'text-success border-success/30 bg-success/10' : 'text-warning border-warning/30 bg-warning/10'}`}>
                                                {c.difficulty}
                                            </span>
                                            <Activity size={14} className={selectedCase?.id === c.id ? 'text-accent-magenta' : 'text-gray-600'} />
                                        </div>
                                        <h5 className="text-white font-bold mb-1">{c.case_title}</h5>
                                        <p className="text-[10px] text-gray-500 font-mono uppercase mb-4">{c.gender}, {c.age} Years</p>
                                        <div className="text-xs text-gray-400 line-clamp-2 italic">&quot;{c.initial_complaint}&quot;</div>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-8 flex justify-end">
                                <GlassButton 
                                    disabled={!selectedCase || isCalling}
                                    onClick={() => selectedCase && startSimulation(selectedCase.id)}
                                    className="!rounded-xl border-accent-magenta/30 !px-10 bg-accent-magenta/10 hover:bg-accent-magenta/20"
                                >
                                    {isCalling ? 'INITIALIZING...' : 'START SIMULATION'}
                                </GlassButton>
                            </div>
                        </div>
                    ) : report ? (
                        /* Evaluation Report */
                        <div className="p-10 overflow-y-auto flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-accent-magenta/20 flex items-center justify-center border border-accent-magenta/30 mb-6">
                                <Award size={40} className="text-accent-magenta" />
                            </div>
                            <h4 className="text-2xl font-bold text-white mb-2">Simulation Evaluated</h4>
                            <div className="text-5xl font-black text-accent-magenta mb-8">{report.score}%</div>
                            
                            <GlassCard className="max-w-xl text-left bg-black/40 border-white/5 mb-8">
                                <div className="flex items-center gap-2 mb-3 text-accent-cyan">
                                    <Brain size={16} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">AI Feedback</span>
                                </div>
                                <p className="text-sm text-gray-300 leading-relaxed italic">&quot;{report.feedback}&quot;</p>
                            </GlassCard>

                            <div className="w-full max-w-xl space-y-3 mb-10">
                                <div className="flex items-center gap-2 mb-2 text-danger">
                                    <ShieldAlert size={16} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Areas for Improvement</span>
                                </div>
                                {report.missed_red_flags.map((flag: string, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-danger/5 border border-danger/10 rounded-xl">
                                        <span className="text-xs text-gray-400">{flag}</span>
                                        <span className="text-[8px] font-black text-danger uppercase tracking-widest">Missed</span>
                                    </div>
                                ))}
                            </div>

                            <GlassButton onClick={onComplete} className="!rounded-xl !px-12">RETURN TO TERMINAL</GlassButton>
                        </div>
                    ) : (
                        /* Simulation Interface (Chat/Voice) */
                        <div className="flex-1 flex flex-col overflow-hidden bg-black/40">
                            <div className="p-4 bg-white/[0.03] border-b border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-danger animate-pulse shadow-[0_0_8px_#ef4444]" />
                                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Live_Simulation_In_Progress</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                                        <User size={12} /> {selectedCase?.name}
                                    </div>
                                    <div className="h-3 w-px bg-white/10" />
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                                        <Stethoscope size={12} /> {selectedCase?.case_title}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {transcript.map((msg, i) => (
                                    <motion.div 
                                        initial={{ opacity: 0, x: msg.role === 'PATIENT' ? -10 : 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={i} 
                                        className={`flex ${msg.role === 'PATIENT' ? 'justify-start' : 'justify-end'}`}
                                    >
                                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.role === 'PATIENT' ? 'bg-white/5 text-gray-300 border border-white/5 rounded-tl-none' : 'bg-accent-magenta/20 text-white border border-accent-magenta/30 rounded-tr-none font-medium'}`}>
                                            <div className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-50">{msg.role}</div>
                                            {msg.text}
                                        </div>
                                    </motion.div>
                                ))}
                                {evaluating && (
                                    <div className="flex justify-center py-8">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-8 h-8 border-2 border-accent-magenta/20 border-t-accent-magenta rounded-full animate-spin" />
                                            <span className="text-[10px] font-mono text-accent-magenta uppercase animate-pulse">Running_Neural_Evaluation...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-white/5 bg-white/[0.01] flex gap-4 items-center">
                                <div className="flex-1 relative">
                                    <input 
                                        type="text"
                                        placeholder="Type your diagnostic question..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-sm text-white focus:outline-none focus:border-accent-magenta/50 transition-all font-mono"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                const text = (e.target as HTMLInputElement).value;
                                                if (!text) return;
                                                setTranscript([...transcript, { role: 'DOCTOR', text }]);
                                                (e.target as HTMLInputElement).value = '';
                                                // Simulated patient response
                                                setTimeout(() => {
                                                    setTranscript(prev => [...prev, { role: 'PATIENT', text: "I'm not sure, doctor. It just feels very uncomfortable." }]);
                                                }, 1000);
                                            }
                                        }}
                                    />
                                    <Send size={16} className="absolute right-4 top-3.5 text-gray-600" />
                                </div>
                                <div className="h-10 w-px bg-white/10" />
                                <button 
                                    onClick={endSimulation}
                                    className="px-6 py-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold uppercase tracking-widest hover:bg-danger hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                >
                                    End Session
                                </button>
                            </div>
                        </div>
                    )}
                </GlassCard>
            </motion.div>
        </div>
    );
}

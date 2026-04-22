'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
    Activity, Heart, Thermometer, Droplets, Mic, 
    MessageSquare, ChevronLeft, ShieldAlert, Zap, 
    Stethoscope, Send
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CallDetails {
    call_id: number;
    user_name: string;
    severity: string;
    transcript: string;
    start_time: string;
    state: string;
}

export default function InterventionClient() {
    const params = useParams();
    const router = useRouter();
    const callId = params.call_id;
    
    const [call, setCall] = useState<CallDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
    const [inputText, setInputText] = useState('');
    
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchCallDetails = async () => {
            const token = localStorage.getItem('access_token');
            try {
                const res = await fetch(`/api/calls/${callId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCall(data);
                    const lines = data.transcript?.split('\n') || [];
                    const parsed = lines.map((l: string) => {
                        if (l.startsWith('PATIENT:')) return { role: 'user', text: l.replace('PATIENT:', '').trim() };
                        if (l.startsWith('ASSISTANT:')) return { role: 'assistant', text: l.replace('ASSISTANT:', '').trim() };
                        return { role: 'system', text: l.trim() };
                    }).filter((m: any) => m.text);
                    setMessages(parsed);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCallDetails();
        scrollToBottom();
    }, [callId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleBack = () => router.push('/doctor');

    if (loading || !call) {
        return <div className="flex h-screen w-full items-center justify-center bg-black"><Activity className="animate-spin text-accent-blue" /></div>;
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 flex flex-col gap-6 font-sans">
            <header className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight uppercase flex items-center gap-2">
                            <Stethoscope className="text-accent-blue" size={20} />
                            Intervention Terminal <span className="text-gray-500 font-mono text-sm ml-2">#DGN-{callId}</span>
                        </h1>
                        <p className="text-[10px] font-mono text-success uppercase tracking-widest animate-pulse">Live Uplink Active</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-danger/10 border border-danger/30 text-danger rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-danger/20 transition-all">
                        Terminate AI
                    </button>
                    <button className="px-6 py-2 bg-accent-blue text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all">
                        Issue Prescription
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <GlassCard className="p-6 border-l-4 border-l-danger">
                        <div className="flex items-center gap-3 mb-6">
                            <ShieldAlert className="text-danger" size={20} />
                            <h3 className="font-bold uppercase tracking-widest text-sm">Patient Telemetry</h3>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-danger/10 text-danger"><Heart size={18} className="animate-pulse" /></div>
                                    <span className="text-sm text-gray-400 font-medium">Heart Rate</span>
                                </div>
                                <div className="text-2xl font-black font-mono">112 <span className="text-[10px] text-gray-500">BPM</span></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue"><Droplets size={18} /></div>
                                    <span className="text-sm text-gray-400 font-medium">Blood Pressure</span>
                                </div>
                                <div className="text-2xl font-black font-mono">145/95 <span className="text-[10px] text-gray-500">mmHg</span></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-warning/10 text-warning"><Thermometer size={18} /></div>
                                    <span className="text-sm text-gray-400 font-medium">Core Temp</span>
                                </div>
                                <div className="text-2xl font-black font-mono">101.4 <span className="text-[10px] text-gray-500">°F</span></div>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 flex-1">
                        <h3 className="font-bold uppercase tracking-widest text-sm mb-4 text-gray-400">Patient Profile</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-mono">Name</label>
                                <p className="text-lg font-bold">{call.user_name || "Unknown Patient"}</p>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-mono">Initial AI Diagnosis</label>
                                <p className="text-sm text-accent-blue italic">&quot;AI-generated preliminary diagnosis.&quot;</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-6">
                    <GlassCard className="flex-1 flex flex-col !p-0 overflow-hidden relative border-accent-blue/20">
                        <div className="absolute inset-0 pointer-events-none opacity-10">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent-blue rounded-full blur-[120px] animate-pulse" />
                        </div>

                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-success animate-ping" />
                                <span className="text-xs font-bold uppercase tracking-widest">Live Streaming Transcript</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
                            {messages.map((msg, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                                        msg.role === 'user' 
                                        ? 'bg-accent-blue/20 border border-accent-blue/30 rounded-tr-none' 
                                        : msg.role === 'system'
                                        ? 'bg-white/5 border border-white/10 text-gray-400 italic text-xs'
                                        : 'bg-white/10 border border-white/20 rounded-tl-none'
                                    }`}>
                                        <p className="text-sm leading-relaxed">
                                            {msg.role !== 'system' && <span className="text-[10px] font-black uppercase mr-2 opacity-50">{msg.role}:</span>}
                                            {msg.text}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={transcriptEndRef} />
                        </div>

                        <div className="p-6 bg-black/60 backdrop-blur-2xl border-t border-white/10 z-10">
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setIsVoiceActive(!isVoiceActive)}
                                    className={`p-4 rounded-2xl border transition-all ${
                                        isVoiceActive 
                                        ? 'bg-danger text-white border-danger shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    <Mic size={24} className={isVoiceActive ? 'animate-pulse' : ''} />
                                </button>
                                <div className="flex-1 relative">
                                    <input 
                                        type="text"
                                        placeholder="Type to intervene (AI will yield)..."
                                        className="w-full h-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-accent-blue/50 transition-colors font-medium"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                    />
                                    <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-accent-blue rounded-xl text-white hover:scale-105 transition-transform">
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </main>
        </div>
    );
}

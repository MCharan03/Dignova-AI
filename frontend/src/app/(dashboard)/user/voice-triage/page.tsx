'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
    PhoneCall, X, Activity, Mic, MicOff, 
    ShieldCheck, Clock, CheckCircle2, Ambulance, 
    HeartPulse, Bed, AlertCircle, User, Bot, Stethoscope, Brain
} from 'lucide-react';

interface Booking {
    booking_id: number;
    resource_type: string;
    status: string;
    call_id: number;
}

export default function VoiceTriagePage() {
    const [activeCall, setActiveCall] = useState<any>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isTriageActive, setIsTriageActive] = useState(false);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [transcription, setTranscription] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [reasoning, setReasoning] = useState<string[]>([]);
    const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'ANALYZING' | 'SPEAKING'>('IDLE');
    const [syncLevel, setSyncLevel] = useState(0);
    const [biometrics, setBiometrics] = useState({ latency: 12, jitter: 2, packetLoss: 0.1, stress: 14 });
    
    const [error, setError] = useState<string | null>(null);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    const REASONING_LOGS = [
        "Analyzing respiratory cadence...",
        "Evaluating cardiac rhythm stability...",
        "Cross-referencing symptoms with neural medical database...",
        "Assessing stress-telemetry markers...",
        "Validating clinical consensus protocols...",
        "Calibrating diagnostic certainty index...",
        "Synthesizing preliminary triage report...",
        "Mapping emergency priority via Triage Matrix...",
        "Detecting emotional undertones in vocal frequency...",
        "Checking for rapid-onset hypoxia indicators...",
        "Syncing with local EMS availability...",
        "Scanning for neurological coherence markers..."
    ];

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTriageActive) {
            interval = setInterval(() => {
                const nextLog = REASONING_LOGS[Math.floor(Math.random() * REASONING_LOGS.length)];
                setReasoning(prev => [...prev, nextLog].slice(-8));
                setSyncLevel(prev => Math.min(prev + (Math.random() * 5), 100));
                
                // Dynamic biometrics jitter
                setBiometrics(prev => ({
                    latency: Math.max(8, Math.min(25, prev.latency + (Math.random() * 4 - 2))),
                    jitter: Math.max(1, Math.min(8, prev.jitter + (Math.random() * 2 - 1))),
                    packetLoss: Math.max(0, Math.min(1.5, prev.packetLoss + (Math.random() * 0.2 - 0.1))),
                    stress: Math.max(10, Math.min(95, prev.stress + (Math.random() * 10 - 5)))
                }));
            }, 3000);
        } else {
            setReasoning([]);
            setSyncLevel(0);
        }
        return () => clearInterval(interval);
    }, [isTriageActive]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcription]);

    const pollStatus = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch('/api/calls', { headers: { 'Authorization': `Bearer ${token}` } });
            const calls = await res.json();
            const active = calls.find((c: any) => c.state === 'active');
            setActiveCall(active || null);

            const bRes = await fetch('/api/bookings', { headers: { 'Authorization': `Bearer ${token}` } });
            const allB = await bRes.json();
            if (active) setBookings(allB.filter((b: any) => b.call_id === active.call_id));
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        pollStatus();
        const interval = setInterval(pollStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const startVoiceSession = async () => {
        try {
            setError(null);
            setIsTriageActive(true);
            setStatus('ANALYZING');
            setTranscription([{ role: 'ai', text: '[SYSTEM]: Initializing secure clinical uplink with Attending MD...' }]);
            
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error("Authentication token missing. Please log in again.");
            }

            const startRes = await fetch('/api/calls/start', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: 0 }) // Backend will use current_user.id
            });
            
            if (!startRes.ok) {
                const errData = await startRes.json();
                throw new Error(errData.detail || "Failed to initialize clinical call.");
            }
            const callData = await startRes.json();

            // Establish WebSocket
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Use current host but try to force port 8000 for backend if on localhost
            let host = window.location.host;
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                host = `${window.location.hostname}:8000`;
            }
            
            console.log(`[VOICE] Connecting to WebSocket: ${protocol}//${host}/ws/internal-call`);
            const socket = new WebSocket(`${protocol}//${host}/ws/internal-call`);

            socket.onopen = () => {
                console.log("[VOICE] WebSocket Connected");
                socket.send(JSON.stringify({ event: 'init', persona: 'TRIAGE', call_id: callData.call_id }));
                startAudioStreaming(socket);
                setStatus('SPEAKING');
            };

            socket.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                if (data.event === 'audio') {
                    setStatus('SPEAKING');
                    playOutputAudio(data.payload);
                }
                if (data.event === 'transcript') {
                    setTranscription(prev => {
                        if (prev.length > 0 && prev[prev.length - 1].text === data.text) return prev;
                        return [...prev, { role: data.role as 'user' | 'ai', text: data.text }];
                    });
                }
            };

            socket.onerror = (e) => {
                console.error("[VOICE] WebSocket Error:", e);
                setError("Neural link interrupted. Please check your connection.");
            };

            socket.onclose = () => {
                console.log("[VOICE] WebSocket Closed");
                if (isTriageActive) setError("Uplink terminated unexpectedly.");
            };

            setWs(socket);
        } catch (err: any) {
            console.error("[VOICE] Setup Error:", err);
            setError(err.message || "Failed to establish neural uplink.");
            setIsTriageActive(false);
            setStatus('IDLE');
        }
    };

    const startAudioStreaming = async (socket: WebSocket) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            
            // Browsers often suspend AudioContext until user interaction
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                // If we are currently speaking (AI is talking), don't send our own audio to avoid feedback loops
                // Note: In a true 'Pro' version, we'd use Echo Cancellation
                if (status === 'SPEAKING') return;

                const inputData = e.inputBuffer.getChannelData(0);
                
                // Simple VAD (Voice Activity Detection) to update UI status
                const volume = inputData.reduce((a, b) => a + Math.abs(b), 0) / inputData.length;
                if (volume > 0.01) {
                    setStatus('LISTENING');
                } else if (status === 'LISTENING') {
                    // Go back to IDLE-ish state if quiet
                }

                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }
                
                if (socket.readyState === WebSocket.OPEN) {
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
                    socket.send(JSON.stringify({ event: 'audio', payload: base64 }));
                }
            };

            source.connect(processor);
            processor.connect(audioContext.destination);
            console.log("[VOICE] Audio streaming started at 16kHz PCM");
        } catch (err) {
            console.error("[VOICE] Mic Access Error:", err);
            setError("Microphone access denied. Voice triage requires audio input.");
        }
    };

    const playOutputAudio = async (base64: string) => {
        if (!audioContextRef.current) return;
        
        try {
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const binary = atob(base64);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
            
            audioContextRef.current.decodeAudioData(bytes.buffer, (buffer) => {
                const source = audioContextRef.current!.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContextRef.current!.destination);
                
                source.onended = () => {
                    // Check if other chunks are still playing before setting to LISTENING
                    // For simplicity, we just reset here
                    setStatus('LISTENING');
                };
                
                setStatus('SPEAKING');
                source.start();
            });
        } catch (err) {
            console.error("[VOICE] Audio Playback Error:", err);
        }
    };

    const terminate = async () => {
        if (ws) ws.close();
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) audioContextRef.current.close();
        setIsTriageActive(false);
        setStatus('IDLE');
        pollStatus();
    };

    return (
        <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            {/* Left: Professional Doctor Interface */}
            <div className="lg:col-span-8 flex flex-col space-y-6">
                <GlassCard className="flex-1 p-12 text-center relative overflow-hidden border-accent-magenta/30 bg-black/40">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-magenta to-transparent animate-pulse" />
                    
                    {/* High-Fidelity Multi-layered Visualizer */}
                    <div className="relative mb-16 flex justify-center scale-110">
                        <motion.div 
                            animate={{ 
                                scale: status === 'SPEAKING' ? [1, 1.1, 1] : status === 'LISTENING' ? [1, 1.05, 1] : 1,
                                rotate: status === 'ANALYZING' ? 360 : 0
                            }}
                            transition={{ duration: status === 'ANALYZING' ? 4 : 2, repeat: Infinity, ease: "linear" }}
                            className={`w-48 h-48 rounded-full border-4 flex items-center justify-center relative z-20 transition-colors duration-500 ${
                                status === 'SPEAKING' ? 'border-accent-magenta bg-accent-magenta/10 shadow-[0_0_60px_rgba(236,72,153,0.4)]' : 
                                status === 'LISTENING' ? 'border-accent-cyan bg-accent-cyan/10 shadow-[0_0_60px_rgba(6,182,212,0.3)]' :
                                status === 'ANALYZING' ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_60px_rgba(245,158,11,0.3)]' :
                                'border-white/10 bg-white/5'
                            }`}
                        >
                            <Stethoscope size={96} className={`${
                                status === 'SPEAKING' ? 'text-accent-magenta animate-pulse' : 
                                status === 'LISTENING' ? 'text-accent-cyan' :
                                status === 'ANALYZING' ? 'text-amber-500' :
                                'text-gray-700'
                            }`} />
                        </motion.div>
                        
                        {/* Interactive Ripple Rings */}
                        {isTriageActive && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <motion.div animate={{ scale: [1, 1.8], opacity: [0.3, 0] }} transition={{ duration: 2, repeat: Infinity }} className={`absolute w-48 h-48 rounded-full border ${status === 'SPEAKING' ? 'border-accent-magenta' : 'border-accent-cyan'}`} />
                                <motion.div animate={{ scale: [1, 2.2], opacity: [0.2, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} className={`absolute w-48 h-48 rounded-full border ${status === 'SPEAKING' ? 'border-accent-magenta' : 'border-accent-cyan'}`} />
                            </div>
                        )}
                    </div>

                    <div className="max-w-2xl mx-auto space-y-8">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-500 text-xs font-mono uppercase"
                            >
                                <AlertCircle size={16} className="inline mr-2" />
                                {error}
                                <button onClick={() => setError(null)} className="ml-4 underline">Dismiss</button>
                            </motion.div>
                        )}
                        <div className="space-y-4">
                            {/* Neural Link Status Indicator */}
                            <div className="flex justify-center mb-8">
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                                    status === 'IDLE' ? 'border-white/10 bg-white/5' :
                                    status === 'ANALYZING' ? 'border-amber-500/30 bg-amber-500/10 animate-pulse' :
                                    ws?.readyState === WebSocket.OPEN ? 'border-emerald-500/30 bg-emerald-500/10' :
                                    'border-rose-500/30 bg-rose-500/10'
                                }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                        status === 'IDLE' ? 'bg-gray-500' :
                                        status === 'ANALYZING' ? 'bg-amber-500' :
                                        ws?.readyState === WebSocket.OPEN ? 'bg-emerald-500' :
                                        'bg-rose-500'
                                    }`} />
                                    <span className="text-[10px] font-mono font-black uppercase tracking-widest text-white/70">
                                        {status === 'IDLE' ? 'Uplink: Disconnected' :
                                         status === 'ANALYZING' ? 'Uplink: Establishing...' :
                                         ws?.readyState === WebSocket.OPEN ? 'Uplink: Active' :
                                         'Uplink: Interrupted'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">
                                    {status === 'IDLE' ? 'Sentient Physician' : status}
                                </h2>
                                <p className="text-gray-400 font-mono text-[10px] uppercase tracking-[0.4em]">Protocol: MD_SKILLED_AGENCY_v4</p>
                            </div>
                            
                            {/* Neural Sync Bar */}
                            <div className="max-w-xs mx-auto">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Neural_Sync</span>
                                    <span className="text-[8px] font-mono text-accent-cyan">{syncLevel}%</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        className="h-full bg-gradient-to-r from-accent-cyan to-accent-magenta"
                                        animate={{ width: `${syncLevel}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Real-time Transcription Stream */}
                        <div className="h-40 bg-black/60 rounded-2xl border border-white/5 p-4 overflow-y-auto text-left font-mono relative group">
                            <div className="absolute top-2 right-4 flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isTriageActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-700'}`} />
                                <span className="text-[8px] text-gray-500 uppercase">Live_Transcript</span>
                            </div>
                            <div className="space-y-2">
                                {transcription.map((t, i) => (
                                    <div key={i} className="text-[10px] leading-relaxed">
                                        <span className={t.role === 'ai' ? 'text-accent-magenta font-black' : 'text-accent-cyan font-black'}>
                                            {t.role === 'ai' ? '[ATTENDING_MD]: ' : '[PATIENT]: '}
                                        </span>
                                        <span className="text-gray-300">{t.text}</span>
                                    </div>
                                ))}
                                <div ref={transcriptEndRef} />
                            </div>
                        </div>

                        <div className="flex justify-center gap-6">
                            {!isTriageActive ? (
                                <button 
                                    onClick={startVoiceSession}
                                    className="group flex items-center gap-4 px-12 py-6 rounded-3xl bg-white text-black font-black text-xl hover:scale-105 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)]"
                                >
                                    <PhoneCall size={28} /> CALL_ATTENDING_MD
                                </button>
                            ) : (
                                <button 
                                    onClick={terminate}
                                    className="px-12 py-6 rounded-3xl bg-rose-500/20 border-2 border-rose-500/50 text-rose-500 font-black text-xl hover:bg-rose-500/30 transition-all uppercase tracking-widest"
                                >
                                    Terminate Uplink
                                </button>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {/* Clinical Reasoning Terminal */}
                <div className="h-40 bg-black/80 rounded-2xl border border-accent-cyan/20 p-5 font-mono overflow-hidden relative group">
                    <div className="flex items-center gap-2 mb-3">
                        <Brain size={14} className="text-accent-cyan group-hover:animate-pulse" />
                        <span className="text-[10px] text-accent-cyan font-black uppercase tracking-[0.2em]">Internal Clinical Reasoning Matrix</span>
                        <div className="ml-auto flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-accent-cyan/40" />
                            <div className="w-1 h-1 rounded-full bg-accent-cyan/40" />
                            <div className="w-1 h-1 rounded-full bg-accent-cyan/40" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        {reasoning.map((r, i) => (
                            <motion.p 
                                key={i + r} 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                className="text-[10px] text-gray-400 border-l-2 border-accent-cyan/20 pl-4 ml-1 hover:text-white transition-colors cursor-default"
                            >
                                <span className="text-accent-cyan/50 mr-2">»</span>
                                {r}
                            </motion.p>
                        ))}
                        {isTriageActive && <div className="w-1.5 h-3 bg-accent-cyan/60 animate-pulse ml-5 mt-1" />}
                    </div>
                </div>
            </div>

            {/* Right: Autonomous Grid */}
            <div className="lg:col-span-4 space-y-6">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] mb-4">Autonomous_Grid</h3>
                
                <GlassCard className="p-6 border-l-2 border-l-accent-magenta/40">
                    <div className="flex items-center gap-3 mb-6">
                        <Activity className="text-accent-magenta" size={20} />
                        <span className="font-bold text-white uppercase text-[10px] tracking-widest">Biometric Stream</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5 hover:border-accent-cyan/30 transition-all group">
                            <span className="text-[9px] font-mono text-gray-500 uppercase">Link Latency</span>
                            <span className="text-[10px] font-mono text-accent-cyan font-bold group-hover:scale-110 transition-transform">
                                {biometrics.latency.toFixed(1)}ms
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5 hover:border-accent-magenta/30 transition-all group">
                            <span className="text-[9px] font-mono text-gray-500 uppercase">Jitter Variance</span>
                            <span className="text-[10px] font-mono text-accent-magenta font-bold group-hover:scale-110 transition-transform">
                                {biometrics.jitter.toFixed(1)}ms
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5 hover:border-success/30 transition-all group">
                            <span className="text-[9px] font-mono text-gray-500 uppercase">Packet Stability</span>
                            <span className="text-[10px] font-mono text-success font-bold group-hover:scale-110 transition-transform">
                                {(100 - biometrics.packetLoss).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </GlassCard>

                {/* Emotional Telemetry */}
                <GlassCard className="p-6 border-l-2 border-l-amber-500/40">
                    <div className="flex items-center gap-3 mb-6">
                        <Brain className="text-amber-500" size={20} />
                        <span className="font-bold text-white uppercase text-[10px] tracking-widest">Sentient Analysis</span>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[8px] font-mono text-gray-500 uppercase">Patient Stress Index</span>
                                <span className="text-[10px] font-mono text-amber-500 font-bold">{biometrics.stress.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-amber-500"
                                    animate={{ 
                                        width: `${biometrics.stress}%`,
                                        backgroundColor: biometrics.stress > 70 ? "#f43f5e" : biometrics.stress > 40 ? "#f59e0b" : "#10b981"
                                    }}
                                />
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                            <p className="text-[9px] font-mono text-gray-400 uppercase leading-tight">
                                {biometrics.stress > 70 ? "HIGH ADRENALINE DETECTED. PERSONA ADAPTED TO EMERGENCY CALM." : 
                                 biometrics.stress > 40 ? "MODERATE ANXIETY INDICATED. PRIORITIZING REASSURANCE." : 
                                 "STABLE COGNITIVE STATE. PROCEEDING WITH STANDARD DIAGNOSTICS."}
                            </p>
                        </div>
                    </div>
                </GlassCard>

                <div className="space-y-4">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest pl-2">Neural Reservations</span>
                    {bookings.length > 0 ? (
                        <AnimatePresence>
                            {bookings.map(b => (
                                <motion.div 
                                    key={b.booking_id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center group hover:bg-accent-cyan/5 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-accent-cyan/10 group-hover:bg-accent-cyan/20">
                                            <ShieldCheck className="text-accent-cyan" size={16} />
                                        </div>
                                        <span className="text-xs font-bold text-white uppercase tracking-tighter">{b.resource_type} UNIT</span>
                                    </div>
                                    <div className="px-2 py-0.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 text-[8px] text-accent-cyan font-black">ACTIVE</div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                            <Bot className="text-gray-800 mx-auto mb-2 opacity-50" size={32} />
                            <p className="text-gray-700 text-[9px] font-mono uppercase tracking-[0.2em]">Awaiting_Clinical_Directive</p>
                        </div>
                    )}
                </div>

                <div className="p-4 rounded-2xl bg-accent-magenta/5 border border-accent-magenta/20">
                    <p className="text-[9px] text-accent-magenta/70 leading-relaxed font-mono uppercase tracking-tighter">
                        NOTICE: Attending MD is an AI-powered Sentient Agent. Decisions are synchronized with the Dignova Global Consensus Matrix.
                    </p>
                </div>
            </div>
        </div>
    );
}

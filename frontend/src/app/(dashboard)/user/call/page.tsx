'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { PhoneCall, AlertCircle, ShieldCheck, Activity, Clock, CheckCircle2, Ambulance, HeartPulse, Bed, MessageSquare, Send, X, Camera, Mic } from 'lucide-react';

interface Booking {
    booking_id: number;
    resource_type: string;
    status: string;
}

interface ActiveCall {
    call_id: number;
    state: string;
    diagnosis_given: string | null;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    text: string;
}

export default function UserCallPage() {
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    // Triage Session State
    const [isTrainingMode, setIsTrainingMode] = useState(false);
    const [scenarioId, setScenarioId] = useState<string | null>(null);
    const [diagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
    const [finalDiagnosis, setFinalDiagnosis] = useState('');
    const [evalResult, setEvalResult] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setIsTrainingMode(params.get('training') === '1');
            setScenarioId(params.get('scenario_id'));
        }
    }, []);

    // Triage Session State
    const [isTriageActive, setIsTriageActive] = useState(false);
    const [simCallId, setSimCallId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [ws, setWs] = useState<WebSocket | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                uploadVoice(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Mic access denied:", err);
            setMessages(prev => [...prev, { role: 'assistant', text: "[SYSTEM ERROR]: Microphone access denied." }]);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const uploadVoice = async (blob: Blob) => {
        if (!simCallId) return;
        setChatLoading(true);
        setMessages(prev => [...prev, { role: 'user', text: "[VOICE NOTE SENT]" }]);
        
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'triage_voice.webm');
            
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/calls/${simCallId}/voice`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', text: `[TRANSCRIPT]: "${data.transcript}"` }]);
            setMessages(prev => [...prev, { role: 'assistant', text: data.analysis }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'assistant', text: "Voice processing failed." }]);
        } finally {
            setChatLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !simCallId) return;

        setChatLoading(true);
        setIsScanning(true);
        setMessages(prev => [...prev, { role: 'user', text: `[ATTACHED IMAGE: ${file.name}]` }]);
        setMessages(prev => [...prev, { role: 'assistant', text: '[SYSTEM]: Scanning biometric visual data...' }]);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/calls/${simCallId}/vision`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            setIsScanning(false);
            setMessages(prev => [...prev, { role: 'assistant', text: `[ANALYSIS COMPLETE]: ${data.analysis}` }]);
            
            // Trigger 3D feedback
            window.dispatchEvent(new CustomEvent('dignova-triage-update', { 
                detail: { severity: data.severity } 
            }));

        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'assistant', text: 'Visual uplink failed.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const pollStatus = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const callsRes = await fetch('/api/calls', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!callsRes.ok) throw new Error("Fetch failed");
            
            const calls = await callsRes.json();
            const active = calls.find((c: any) => c.state === 'active' || c.state === 'evaluation');
            setActiveCall(active || null);

            const bookingsRes = await fetch('/api/bookings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const allBookings = await bookingsRes.json();
            if (active) {
                setBookings(allBookings.filter((b: any) => b.call_id === active.call_id));
            } else {
                setBookings([]);
            }
        } catch (err) {
            console.error("Polling error:", err);
            setActiveCall(null);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        pollStatus();
        const interval = setInterval(pollStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const startTriage = async () => {
        try {
            setIsTriageActive(true);
            setMessages([{ role: 'assistant', text: isTrainingMode ? 'Establishing Simulation Uplink... Please wait.' : 'Establishing Neural Uplink... Please wait.' }]);
            
            const token = localStorage.getItem('access_token');
            const meRes = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const userData = await meRes.json();

            let callIdToUse;
            if (isTrainingMode && scenarioId) {
                const startRes = await fetch(`/api/hospital/training/start/${scenarioId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!startRes.ok) throw new Error("Failed to initialize training session");
                const callData = await startRes.json();
                callIdToUse = callData.report_id;
            } else {
                const startRes = await fetch('/api/calls/start', {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user_id: userData.id })
                });
                if (!startRes.ok) throw new Error("Failed to initialize call session");
                const callData = await startRes.json();
                callIdToUse = callData.call_id;
            }
            setSimCallId(callIdToUse);

            // 2. Establish WebSocket for Sentient AI
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
            const wsUrl = `${protocol}//${host}/ws/internal-call`;
            
            const socket = new WebSocket(wsUrl);
            
            socket.onopen = () => {
                console.log("Sentient Uplink Established");
                socket.send(JSON.stringify({
                    event: 'init',
                    persona: isTrainingMode ? 'TRAINING_PATIENT' : 'TRIAGE',
                    call_id: callIdToUse
                }));
                setMessages([{ role: 'assistant', text: isTrainingMode ? 'Simulation Connected. You may begin the triage.' : 'Connecting to Dignova AI... Please state your emergency.' }]);
            };

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                // Handle realtime events
            };

            socket.onclose = () => {
                console.log("Sentient Uplink Severed");
                setWs(null);
            };

            setWs(socket);
            pollStatus();
        } catch (err) {
            console.error(err);
            setIsTriageActive(false);
            setMessages([{ role: 'assistant', text: '[CRITICAL ERROR]: Failed to establish secure bridge.' }]);
        }
    };

    const processFinalTriggers = (text: string) => {
        if (text.includes("DIAGNOSIS_READY") || text.includes("EMERGENCY_DETECTED")) {
            setTimeout(() => {
                setIsTriageActive(false);
                setSimCallId(null);
                if (ws) ws.close();
                pollStatus();
            }, 3000);
        }
    };

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim()) return;
        
        if (!simCallId) {
            setMessages(prev => [...prev, { role: 'assistant', text: '[SYSTEM ERROR]: Secure Uplink Severed. Please reconnect.' }]);
            return;
        }

        const userMsg = inputText;
        setInputText('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        
        // Add a placeholder for the assistant's response that we will stream into
        setMessages(prev => [...prev, { role: 'assistant', text: '' }]);
        setChatLoading(true);

        try {
            const token = localStorage.getItem('access_token');
            const endpoint = isTrainingMode 
                ? `/api/hospital/training/${simCallId}/chat` 
                : `/api/calls/${simCallId}/chat`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: userMsg })
            });
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || `Server error (${response.status})`);
            }

            // Detect if response is streaming or JSON
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                const fullText = data.response || '';
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    if (lastIndex >= 0) {
                        newMessages[lastIndex] = { role: 'assistant', text: fullText };
                    }
                    return newMessages;
                });
                processFinalTriggers(fullText);
            } else {
                // Handle Stream
                if (!response.body) throw new Error("No response body");
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = "";

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    fullText += chunk;

                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastIndex = newMessages.length - 1;
                        if (lastIndex >= 0) {
                            newMessages[lastIndex] = { role: 'assistant', text: fullText };
                        }
                        return newMessages;
                    });
                }
                processFinalTriggers(fullText);
            }
        } catch (err: any) {
            console.error('Chat error:', err);
            // Update the placeholder message instead of adding a new one
            setMessages(prev => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant' && !newMessages[lastIndex].text) {
                    newMessages[lastIndex] = { role: 'assistant', text: `[SYSTEM]: ${err.message || 'Connection interrupted. Please try again.'}` };
                } else {
                    newMessages.push({ role: 'assistant', text: `[SYSTEM]: ${err.message || 'Connection interrupted. Please try again.'}` });
                }
                return newMessages;
            });
        } finally {
            setChatLoading(false);
        }
    };

    const handleTerminate = async (callId: number) => {
        if (isTrainingMode) {
            setDiagnosisModalOpen(true);
            return;
        }

        // Immediate UI reset for better "Sentient" feel
        setActiveCall(null);
        setBookings([]);
        setIsTriageActive(false);
        setSimCallId(null);
        if (ws) ws.close();

        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/calls/${callId}/terminate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Backend synchronization failure");
            pollStatus();
        } catch (err) {
            console.error("Termination failed:", err);
        }
    };

    const submitFinalDiagnosis = async () => {
        if (!scenarioId || !finalDiagnosis.trim()) return;
        setChatLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`/api/hospital/training/submit/${scenarioId}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ diagnosis: finalDiagnosis })
            });
            if (!res.ok) throw new Error("Failed to submit diagnosis");
            const data = await res.json();
            setEvalResult(data);
        } catch (err) {
            console.error(err);
            alert("Error submitting diagnosis");
        } finally {
            setChatLoading(false);
        }
    };

    const closeSimulation = () => {
        setDiagnosisModalOpen(false);
        setEvalResult(null);
        setIsTriageActive(false);
        setSimCallId(null);
        if (ws) ws.close();
        window.location.href = '/intern';
    };

    const getResourceIcon = (type: string) => {
        switch (type) {
            case 'Ambulance': return <Ambulance className="text-accent-magenta" size={24} />;
            case 'ICU': return <HeartPulse className="text-danger" size={24} />;
            case 'General': return <Bed className="text-accent-cyan" size={24} />;
            default: return <Activity size={24} />;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full relative">
            {/* Left Column: Agent Connection */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-8">
                <GlassCard className="p-8 text-center space-y-8 relative overflow-hidden">
                    {/* Status Indicator */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className={`w-4 h-4 rounded-full animate-ping absolute -right-1 -top-1 ${isTriageActive ? 'bg-accent-magenta' : 'bg-success'}`}></div>
                            <div className={`p-6 rounded-full border transition-all duration-500 ${isTriageActive ? 'bg-accent-magenta/10 border-accent-magenta/50 shadow-[0_0_40px_rgba(236,72,153,0.2)]' : 'bg-white/5 border-white/10'}`}>
                                <Activity size={48} className={isTriageActive ? "text-accent-magenta animate-pulse" : "text-accent-cyan"} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-3xl font-bold tracking-tight mb-4">
                            {isTriageActive ? (isTrainingMode ? "Simulation Active" : "Agent Session Active") : (isTrainingMode ? "Training Simulation" : "Dignova AI Agent")}
                        </h2>
                        <p className="text-gray-400 text-lg">
                            {isTriageActive 
                                ? (isTrainingMode ? "You are connected to a simulated patient. Use chat or voice to triage." : "You are connected to the Dignova Sentient Layer. Describe your condition and the AI will triage in real-time.")
                                : (isTrainingMode ? "Connect to a Ghost Replay simulated patient to practice triage and diagnosis." : "Connect directly to the Dignova AI Triage Agent. It will assess your condition, generate a preliminary diagnosis, and auto-reserve hospital resources.")}
                        </p>
                    </div>

                    {/* Direct Agent Call Button */}
                    <div className="flex justify-center">
                        <button 
                            onClick={startTriage}
                            disabled={isTriageActive || Boolean(!isTrainingMode && activeCall && activeCall.state === 'active')}
                            className={`group relative flex items-center gap-3 px-10 py-5 rounded-2xl font-bold tracking-widest transition-all duration-500 uppercase text-lg overflow-hidden ${
                                isTriageActive 
                                    ? (isTrainingMode ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 cursor-not-allowed opacity-60' : 'bg-accent-magenta/20 border-accent-magenta/50 text-accent-magenta cursor-not-allowed opacity-60')
                                    : (isTrainingMode ? 'bg-white/5 text-amber-500 border border-amber-500/30 hover:border-amber-500 hover:shadow-[0_0_40px_rgba(245,158,11,0.3)] active:scale-95' : 'bg-white/5 text-white border border-white/10 hover:border-accent-cyan/70 hover:shadow-[0_0_40px_rgba(0,255,255,0.25)] active:scale-95')
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {/* NEW: Left-to-Right Loading Fill */}
                            {isTriageActive && (
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: 2, ease: "easeInOut" }}
                                    className={`absolute inset-0 z-0 ${isTrainingMode ? 'bg-amber-500/20' : 'bg-accent-magenta/20'}`}
                                />
                            )}
                            
                            <span className="relative z-10 flex items-center gap-3">
                                <PhoneCall size={24} className={isTriageActive ? "animate-pulse" : ""} />
                                {isTriageActive ? 'Initializing Link...' : (isTrainingMode ? 'Start Simulation' : 'Call Agent')}
                            </span>
                        </button>
                    </div>

                    <div className="text-left bg-white/5 border border-white/10 p-6 rounded-xl space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <ShieldCheck className="text-success" size={20} />
                            How it works
                        </h3>
                        <ul className="text-gray-300 space-y-2 list-disc list-inside pl-4 text-sm">
                            <li>Click &quot;Call Agent&quot; to connect to the AI triage system.</li>
                            <li>Describe your symptoms — the agent will ask follow-up questions.</li>
                            <li>The AI generates a diagnosis and auto-reserves hospital resources.</li>
                            <li>You can attach images for visual analysis during the session.</li>
                        </ul>
                    </div>
                </GlassCard>
            </div>

            {/* Right Column: Live Status Board */}
            <div className="lg:col-span-5 space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2 font-mono uppercase tracking-widest">
                    <Activity size={20} className="text-accent-magenta" />
                    Live Status Board
                </h3>

                {/* Active Triage State */}
                <GlassCard className={`p-6 border-l-4 transition-all ${activeCall ? 'border-l-accent-magenta animate-pulse-subtle' : 'border-l-gray-600 opacity-60'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Current Triage</span>
                        {activeCall ? <Activity size={18} className="text-accent-magenta" /> : <Clock size={18} className="text-gray-500" />}
                    </div>
                    
                    {activeCall ? (
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-2xl font-bold text-white">
                                    {activeCall.state === 'active' ? 'Agent Session Active' : 'Processing Evaluation'}
                                </h4>
                                <p className="text-accent-magenta text-sm font-mono uppercase">AI IS ANALYZING TELEMETRY.</p>
                            </div>
                            <button 
                                onClick={() => handleTerminate(activeCall.call_id)}
                                className="w-full py-2 rounded-lg bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger text-xs font-bold uppercase tracking-widest transition-all"
                            >
                                Terminate Session
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <h4 className="text-2xl font-bold text-gray-500 italic">No Active Session</h4>
                            <p className="text-gray-600 text-sm">Click &quot;Call Agent&quot; to begin.</p>
                        </div>
                    )}
                </GlassCard>

                {/* Resource Bookings */}
                <div className="space-y-4">
                    <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Automated Bookings</span>
                    
                    {bookings.length > 0 ? (
                        bookings.map(booking => (
                            <GlassCard key={booking.booking_id} className="p-4 border border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        {getResourceIcon(booking.resource_type)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white font-mono">{booking.resource_type} UNIT</div>
                                        <div className="text-xs text-gray-400">Request ID: #{booking.booking_id}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-accent-cyan uppercase">{booking.status}</span>
                                    <CheckCircle2 size={16} className="text-accent-cyan" />
                                </div>
                            </GlassCard>
                        ))
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed border-white/5 rounded-2xl">
                            <AlertCircle className="mx-auto mb-2 text-gray-700" size={24} />
                            <p className="text-gray-600 text-sm font-mono uppercase">No resources allocated.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20">
                    <p className="text-[10px] text-accent-cyan leading-relaxed font-mono">
                        SYSTEM LOG: [NETWORK_ID: DGN-44] [LATENCY: 12ms] [ENCRYPTION: AES-256] 
                        The Dignova Sentient Layer is monitoring all active channels. 
                        Resource allocation is subject to system homeostasis.
                    </p>
                </div>
            </div>

            {/* Triage Chat Modal */}
            {isTriageActive && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
                    <GlassCard className="max-w-2xl w-full h-[600px] max-h-[90vh] flex flex-col border-accent-cyan/50 shadow-[0_0_50px_rgba(0,255,255,0.15)] relative overflow-hidden">
                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-cyan to-transparent animate-pulse"></div>
                        
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-3">
                                <Activity className="text-accent-cyan animate-pulse" size={24} />
                                <div>
                                    <h3 className="font-bold font-mono tracking-widest text-white uppercase">Dignova AI Link</h3>
                                    <p className="text-xs text-accent-cyan">Secure Encrypted Channel</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => simCallId && handleTerminate(simCallId)}
                                    className="text-[10px] font-bold text-danger border border-danger/30 px-2 py-1 rounded bg-danger/5 hover:bg-danger/10 transition-colors uppercase tracking-widest"
                                >
                                    Terminate
                                </button>
                                <button onClick={() => simCallId ? handleTerminate(simCallId) : setIsTriageActive(false)} className="text-gray-400 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 relative">
                            {/* AR SCANNER OVERLAY */}
                            <AnimatePresence>
                                {isScanning && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center p-12"
                                    >
                                        <div className="w-full h-full border-2 border-accent-cyan/20 rounded-3xl relative overflow-hidden bg-accent-cyan/[0.02]">
                                            {/* Laser Sweep */}
                                            <motion.div 
                                                animate={{ top: ['0%', '100%', '0%'] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                                className="absolute left-0 right-0 h-[2px] bg-accent-cyan shadow-[0_0_15px_#06b6d4] z-20"
                                            />
                                            {/* Corner Brackets */}
                                            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-accent-cyan rounded-tl-lg" />
                                            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-accent-cyan rounded-tr-lg" />
                                            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-accent-cyan rounded-bl-lg" />
                                            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-accent-cyan rounded-br-lg" />
                                            
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <p className="text-[10px] font-mono text-accent-cyan uppercase tracking-[0.4em] animate-pulse bg-black/40 px-4 py-2 rounded-full">
                                                    Digitizing_Handwritten_Parcha...
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-accent-magenta/20 border border-accent-magenta/30 text-white rounded-tr-none' : 'bg-white/5 border border-accent-cyan/20 text-accent-cyan font-mono text-sm rounded-tl-none'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-[80%] p-4 rounded-2xl bg-white/5 border border-accent-cyan/20 text-accent-cyan font-mono text-sm rounded-tl-none flex items-center gap-2">
                                        <Activity size={16} className="animate-spin" /> Processing...
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t border-white/10 bg-black/50">
                            <form onSubmit={sendMessage} className="flex gap-3">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileUpload} 
                                    className="hidden" 
                                    accept="image/*"
                                />
                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 p-3 rounded-xl transition-all"
                                    disabled={chatLoading || isRecording}
                                >
                                    <Camera size={20} />
                                </button>

                                {/* VOICE RECORDING BUTTON */}
                                <button 
                                    type="button"
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
                                        isRecording 
                                            ? 'bg-danger/20 border-danger/50 text-danger animate-pulse shadow-[0_0_15px_rgba(255,0,0,0.2)]' 
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                    disabled={chatLoading}
                                >
                                    <Mic size={20} />
                                    {isRecording && <span className="font-mono text-xs font-bold uppercase">{formatTime(recordingTime)}</span>}
                                </button>

                                <input 
                                    type="text" 
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    placeholder={isRecording ? "Listening..." : "Type your emergency here..."}
                                    className={`flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-cyan/50 font-mono transition-colors ${isRecording ? 'opacity-50 pointer-events-none' : ''}`}
                                    disabled={chatLoading || isRecording}
                                    autoFocus
                                />
                                <button 
                                    type="submit" 
                                    disabled={!inputText.trim() || chatLoading}
                                    className="bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/50 p-3 rounded-xl transition-all disabled:opacity-50"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* Diagnosis Submission Modal */}
            {diagnosisModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4">
                    <GlassCard className="max-w-xl w-full p-8 border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
                        {!evalResult ? (
                            <>
                                <h2 className="text-2xl font-bold text-amber-500 mb-2">Submit Final Diagnosis</h2>
                                <p className="text-gray-400 mb-6">Review the patient's symptoms from the simulation and provide your final triage assessment.</p>
                                <textarea
                                    value={finalDiagnosis}
                                    onChange={(e) => setFinalDiagnosis(e.target.value)}
                                    placeholder="Patient presents with..."
                                    className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:border-amber-500/50 outline-none resize-none mb-6 font-mono"
                                />
                                <div className="flex justify-end gap-4">
                                    <button onClick={closeSimulation} className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white transition-all">Cancel</button>
                                    <button 
                                        onClick={submitFinalDiagnosis}
                                        disabled={!finalDiagnosis.trim() || chatLoading}
                                        className="px-6 py-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-500 hover:bg-amber-500/30 transition-all font-bold"
                                    >
                                        {chatLoading ? "Submitting..." : "Submit Diagnosis"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-3xl font-bold text-success mb-2 flex items-center gap-3"><CheckCircle2 /> Evaluation Complete</h2>
                                <div className="space-y-4 my-8">
                                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
                                        <span className="text-gray-400 font-mono">Final Score</span>
                                        <span className="text-3xl font-bold text-amber-500">{evalResult.score}/10</span>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
                                        <span className="text-gray-400 font-mono">Expert Alignment</span>
                                        <span className="text-2xl font-bold text-accent-cyan">{(evalResult.alignment_with_expert * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                        <span className="text-gray-400 font-mono block mb-2">AI Feedback</span>
                                        <p className="text-white text-sm">{evalResult.feedback}</p>
                                    </div>
                                </div>
                                <button onClick={closeSimulation} className="w-full px-6 py-4 rounded-xl bg-accent-cyan/20 border border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/30 transition-all font-bold uppercase tracking-widest">
                                    Return to Lab
                                </button>
                            </>
                        )}
                    </GlassCard>
                </div>
            )}
        </div>
    );
}

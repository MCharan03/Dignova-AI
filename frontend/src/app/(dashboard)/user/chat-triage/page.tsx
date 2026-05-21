'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
    MessageSquare, Send, X, Camera, Activity, 
    ShieldCheck, Clock, CheckCircle2, Ambulance, 
    HeartPulse, Bed, AlertCircle, Sparkles
} from 'lucide-react';

interface Booking {
    booking_id: number;
    resource_type: string;
    status: string;
    call_id: number;
}

interface ActiveCall {
    call_id: number;
    state: string;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    text: string;
}

export default function ChatTriagePage() {
    const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Triage Session State
    const [isTriageActive, setIsTriageActive] = useState(false);
    const [simCallId, setSimCallId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
            setMessages([{ role: 'assistant', text: 'Establishing Neural Uplink... Please wait.' }]);
            
            const token = localStorage.getItem('access_token');
            const meRes = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const userData = await meRes.json();

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
            setSimCallId(callData.call_id);

            setMessages([{ role: 'assistant', text: 'Connecting to Dignova AI... Please describe your symptoms or medical concern.' }]);
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
                pollStatus();
            }, 3000);
        }
    };

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim()) return;
        
        if (!simCallId) {
            setMessages(prev => [...prev, { role: 'assistant', text: '[SYSTEM ERROR]: Secure Uplink Severed.' }]);
            return;
        }

        const userMsg = inputText;
        setInputText('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setMessages(prev => [...prev, { role: 'assistant', text: '' }]);
        setChatLoading(true);

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`/api/calls/${simCallId}/chat`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: userMsg })
            });
            
            if (!response.ok) throw new Error("Server error");

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: 'assistant', text: data.response };
                    return newMessages;
                });
                processFinalTriggers(data.response);
            } else {
                if (!response.body) throw new Error("No body");
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = "";

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    fullText += decoder.decode(value, { stream: true });
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = { role: 'assistant', text: fullText };
                        return newMessages;
                    });
                }
                processFinalTriggers(fullText);
            }
        } catch (err: any) {
            console.error('Chat error:', err);
            setMessages(prev => [...prev, { role: 'assistant', text: '[ERROR]: Link interrupted.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !simCallId) return;

        setChatLoading(true);
        setIsScanning(true);
        setMessages(prev => [...prev, { role: 'user', text: `[ATTACHED IMAGE: ${file.name}]` }]);

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

    const handleTerminate = async (callId: number) => {
        setActiveCall(null);
        setBookings([]);
        setIsTriageActive(false);
        setSimCallId(null);

        try {
            const token = localStorage.getItem('access_token');
            await fetch(`/api/calls/${callId}/terminate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            pollStatus();
        } catch (err) {
            console.error("Termination failed:", err);
        }
    };

    const getResourceIcon = (type: string) => {
        switch (type) {
            case 'Ambulance': return <Ambulance className="text-accent-magenta" size={20} />;
            case 'ICU': return <HeartPulse className="text-danger" size={20} />;
            case 'General': return <Bed className="text-accent-cyan" size={20} />;
            default: return <Activity size={20} />;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            {/* Left: Chat Control */}
            <div className="lg:col-span-7 flex flex-col justify-center">
                <GlassCard className="p-10 text-center space-y-8 relative overflow-hidden">
                    <div className="flex justify-center">
                        <div className="p-6 rounded-full bg-accent-cyan/10 border border-accent-cyan/20">
                            <MessageSquare size={48} className="text-accent-cyan" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Neural Chat Triage</h2>
                        <p className="text-gray-400">Describe your symptoms via encrypted text link. Dignova AI will analyze your state and coordinate resources.</p>
                    </div>
                    <div className="flex justify-center">
                        <button 
                            onClick={startTriage}
                            disabled={isTriageActive || !!activeCall}
                            className="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold tracking-widest hover:border-accent-cyan/70 transition-all uppercase"
                        >
                            {isTriageActive ? 'Session Active' : 'Start Chat Link'}
                        </button>
                    </div>
                </GlassCard>
            </div>

            {/* Right: Live Board */}
            <div className="lg:col-span-5 space-y-6">
                <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.3em] mb-4">Live_Status_Board</h3>
                
                <GlassCard className={`p-6 border-l-4 ${activeCall ? 'border-l-accent-cyan' : 'border-l-gray-700 opacity-50'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-mono text-gray-500 uppercase">Current Session</span>
                        {activeCall && <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />}
                    </div>
                    {activeCall ? (
                        <div className="space-y-4">
                            <h4 className="text-xl font-bold text-white uppercase tracking-tight">AI Link Established</h4>
                            <button onClick={() => handleTerminate(activeCall.call_id)} className="w-full py-2 rounded-lg bg-danger/10 border border-danger/20 text-danger text-[10px] font-black uppercase tracking-widest">Terminate</button>
                        </div>
                    ) : (
                        <p className="text-gray-600 font-mono text-xs">Waiting for initialization...</p>
                    )}
                </GlassCard>

                <div className="space-y-4">
                    <span className="text-[10px] font-mono text-gray-500 uppercase">Autonomous Bookings</span>
                    {bookings.length > 0 ? (
                        bookings.map(b => (
                            <div key={b.booking_id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {getResourceIcon(b.resource_type)}
                                    <span className="text-xs font-bold text-white uppercase tracking-tighter">{b.resource_type} UNIT</span>
                                </div>
                                <span className="text-[10px] font-mono text-accent-cyan">{b.status}</span>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 border border-dashed border-white/5 rounded-xl text-center text-gray-700 text-[10px] uppercase font-mono">No_Resources_Allocated</div>
                    )}
                </div>
            </div>

            {/* Chat Overlay */}
            {isTriageActive && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
                    <GlassCard className="max-w-2xl w-full h-[650px] flex flex-col border-accent-cyan/40">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Activity className="text-accent-cyan animate-pulse" size={20} />
                                <span className="font-bold text-xs uppercase tracking-widest text-white">Neural_Bridge_v4</span>
                            </div>
                            <button onClick={() => simCallId && handleTerminate(simCallId)}><X className="text-gray-500 hover:text-white" size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <AnimatePresence>
                                {isScanning && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center p-12">
                                        <div className="w-full h-full border border-accent-cyan/20 rounded-3xl relative overflow-hidden bg-accent-cyan/[0.01]">
                                            <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-[1px] bg-accent-cyan/50 shadow-[0_0_15px_#06b6d4]" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-accent-cyan/10 border border-accent-cyan/30 text-white' : 'bg-white/5 border border-white/10 text-gray-300 font-mono'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && <div className="text-[10px] font-mono text-accent-cyan animate-pulse">AI_THINKING...</div>}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t border-white/5">
                            <form onSubmit={sendMessage} className="flex gap-3">
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-500"><Camera size={18} /></button>
                                <input 
                                    value={inputText} onChange={e => setInputText(e.target.value)} 
                                    placeholder="State emergency details..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 text-white text-sm focus:border-accent-cyan/40 outline-none font-mono"
                                />
                                <button type="submit" className="p-3 rounded-xl bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40"><Send size={18} /></button>
                            </form>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}

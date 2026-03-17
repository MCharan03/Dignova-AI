'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PhoneCall, AlertCircle, ShieldCheck, Activity, Clock, CheckCircle2, Ambulance, HeartPulse, Bed, MessageSquare, Send, X, Camera } from 'lucide-react';

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
    const [isTriageActive, setIsTriageActive] = useState(false);
    const [simCallId, setSimCallId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !simCallId) return;

        setChatLoading(true);
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
            setMessages([{ role: 'assistant', text: 'Connecting to Dignova AI... Please state your emergency.' }]);
            
            const token = localStorage.getItem('access_token');
            // Get user ID
            const userRes = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const userData = await userRes.json();

            // Start call
            const startRes = await fetch('/api/calls/start', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userData.id })
            });
            const callData = await startRes.json();
            setSimCallId(callData.call_id);
            pollStatus();
        } catch (err) {
            console.error(err);
            setIsTriageActive(false);
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
            const response = await fetch(`/api/calls/${simCallId}/chat`, {
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

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                // Update the last message in the list with the new accumulated text
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    if (lastIndex >= 0) {
                        newMessages[lastIndex] = { role: 'assistant', text: fullText };
                    }
                    return newMessages;
                });
            }

            // After stream finishes, check for triggers
            if (fullText.includes("DIAGNOSIS_READY") || fullText.includes("EMERGENCY_DETECTED")) {
                setTimeout(() => {
                    setIsTriageActive(false);
                    setSimCallId(null);
                    pollStatus();
                }, 3000);
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
        // Immediate UI reset for better "Sentient" feel
        setActiveCall(null);
        setBookings([]);
        setIsTriageActive(false);
        setSimCallId(null);

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
                            {isTriageActive ? "Agent Session Active" : "Dignova AI Agent"}
                        </h2>
                        <p className="text-gray-400 text-lg">
                            {isTriageActive 
                                ? "You are connected to the Dignova Sentient Layer. Describe your condition and the AI will triage in real-time."
                                : "Connect directly to the Dignova AI Triage Agent. It will assess your condition, generate a preliminary diagnosis, and auto-reserve hospital resources."}
                        </p>
                    </div>

                    {/* Direct Agent Call Button */}
                    <div className="flex justify-center">
                        <button 
                            onClick={startTriage}
                            disabled={isTriageActive || (activeCall && activeCall.state === 'active')}
                            className={`flex items-center gap-3 px-10 py-5 rounded-2xl font-bold tracking-widest transition-all duration-500 uppercase text-lg ${
                                isTriageActive 
                                    ? 'bg-accent-magenta/20 border-accent-magenta/50 text-accent-magenta cursor-not-allowed opacity-60'
                                    : 'bg-gradient-to-r from-accent-cyan/20 to-accent-magenta/20 hover:from-accent-cyan/30 hover:to-accent-magenta/30 text-white border border-accent-cyan/40 hover:border-accent-cyan/70 hover:shadow-[0_0_40px_rgba(0,255,255,0.25)] active:scale-95'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <PhoneCall size={24} />
                            {isTriageActive ? 'Session In Progress...' : 'Call Agent'}
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

                        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
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
                                    disabled={chatLoading}
                                >
                                    <Camera size={20} />
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
                                    placeholder="Type your emergency here..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-cyan/50 font-mono transition-colors"
                                    disabled={chatLoading}
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
        </div>
    );
}


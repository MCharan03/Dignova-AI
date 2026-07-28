'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PhoneCall, PhoneOff, Mic, MicOff, Volume2, VolumeX,
    Brain, Stethoscope, ShieldCheck,
    AlertTriangle, CheckCircle2, Ambulance, ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type CallState = 'IDLE' | 'RINGING' | 'CONNECTED' | 'ENDED';
type AudioMode = 'LIVE' | 'FALLBACK' | 'UNKNOWN';
type SpeechState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

interface TranscriptLine { role: 'user' | 'ai'; text: string; ts: number; }
interface CallSummary {
    duration_seconds: number;
    severity: string;
    diagnosis: string;
    summary: string;
    recommended_resource: string;
    stress_level?: number;
    primary_emotion?: string;
}

// ─── Audio Waveform Bars ───────────────────────────────────────────────────────
// Deterministic heights based on index to avoid hydration mismatch
const BAR_HEIGHTS = [12, 28, 20, 40, 16, 36, 24, 44, 18, 32, 14, 38, 22, 42, 10, 30, 26, 46, 20, 34, 18, 40, 14, 28, 36, 22, 44, 12, 32, 20, 38, 16];

function WaveBars({ active, color = '#06b6d4', count = 28 }: { active: boolean; color?: string; count?: number; }) {
    return (
        <div className="flex items-end gap-[3px]" style={{ height: 48 }}>
            {Array.from({ length: count }).map((_, i) => {
                const h1 = BAR_HEIGHTS[i % BAR_HEIGHTS.length];
                const h2 = BAR_HEIGHTS[(i + 5) % BAR_HEIGHTS.length];
                const h3 = BAR_HEIGHTS[(i + 11) % BAR_HEIGHTS.length];
                return (
                    <motion.div
                        key={i}
                        className="rounded-full w-[3px]"
                        style={{ backgroundColor: color, minHeight: 4 }}
                        animate={active ? {
                            height: [`${h1}px`, `${h2}px`, `${h3}px`],
                            opacity: [0.6, 1, 0.7],
                        } : { height: '4px', opacity: 0.25 }}
                        transition={{
                            duration: 0.4 + (i % 5) * 0.08,
                            repeat: Infinity,
                            repeatType: 'mirror',
                            ease: 'easeInOut',
                            delay: i * 0.03,
                        }}
                    />
                );
            })}
        </div>
    );
}

// ─── AI Avatar Orb ─────────────────────────────────────────────────────────────
function AIOrb({ state }: { state: SpeechState }) {
    const isSpeaking = state === 'SPEAKING';
    const isListening = state === 'LISTENING';
    const isProcessing = state === 'PROCESSING';

    return (
        <div className="relative flex items-center justify-center w-52 h-52 mx-auto select-none">
            {/* Outer glow rings */}
            {(isSpeaking || isListening) && (
                <>
                    <motion.div
                        className="absolute rounded-full border"
                        style={{
                            width: 208, height: 208,
                            borderColor: isSpeaking ? 'rgba(236,72,153,0.4)' : 'rgba(6,182,212,0.4)',
                        }}
                        animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <motion.div
                        className="absolute rounded-full border"
                        style={{
                            width: 208, height: 208,
                            borderColor: isSpeaking ? 'rgba(236,72,153,0.3)' : 'rgba(6,182,212,0.3)',
                        }}
                        animate={{ scale: [1, 2.1], opacity: [0.3, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                    />
                </>
            )}

            {/* Main orb */}
            <motion.div
                className="relative z-10 w-44 h-44 rounded-full flex items-center justify-center"
                style={{
                    background: isSpeaking
                        ? 'radial-gradient(circle at 40% 35%, rgba(236,72,153,0.25) 0%, rgba(139,92,246,0.15) 60%, rgba(0,0,0,0.4) 100%)'
                        : isListening
                        ? 'radial-gradient(circle at 40% 35%, rgba(6,182,212,0.25) 0%, rgba(99,102,241,0.15) 60%, rgba(0,0,0,0.4) 100%)'
                        : isProcessing
                        ? 'radial-gradient(circle at 40% 35%, rgba(245,158,11,0.2) 0%, rgba(0,0,0,0.5) 100%)'
                        : 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.6) 100%)',
                    border: `1px solid ${isSpeaking ? 'rgba(236,72,153,0.5)' : isListening ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: isSpeaking
                        ? '0 0 60px rgba(236,72,153,0.35), inset 0 0 40px rgba(236,72,153,0.1)'
                        : isListening
                        ? '0 0 60px rgba(6,182,212,0.3), inset 0 0 40px rgba(6,182,212,0.1)'
                        : 'none',
                }}
                animate={isSpeaking ? { scale: [1, 1.04, 1] } : isListening ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
                {isProcessing ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                        <Brain size={64} className="text-amber-400" />
                    </motion.div>
                ) : (
                    <Stethoscope
                        size={64}
                        className={
                            isSpeaking ? 'text-pink-400' :
                            isListening ? 'text-cyan-400' :
                            'text-gray-600'
                        }
                    />
                )}

                {/* Inner shimmer */}
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: 'radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.08) 0%, transparent 60%)',
                    }}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
            </motion.div>
        </div>
    );
}

// ─── Call Timer ───────────────────────────────────────────────────────────────
function CallTimer({ running }: { running: boolean }) {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        if (!running) { setSeconds(0); return; }
        const t = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(t);
    }, [running]);
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return (
        <div className="flex items-center gap-2">
            <motion.div className="w-2 h-2 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <span className="font-mono text-sm text-emerald-400 tracking-widest">{mm}:{ss}</span>
        </div>
    );
}

// ─── Severity Badge ───────────────────────────────────────────────────────────
function SeverityBadge({ level }: { level: string }) {
    const map: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
        CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: <Ambulance size={14} /> },
        ELEVATED: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: <AlertTriangle size={14} /> },
        NORMAL: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: <CheckCircle2 size={14} /> },
    };
    const cfg = map[level] || map.NORMAL;
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}40` }}>
            {cfg.icon} {level}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function VoiceTriagePage() {
    const [callState, setCallState] = useState<CallState>('IDLE');
    const [speechState, setSpeechState] = useState<SpeechState>('IDLE');
    const [audioMode, setAudioMode] = useState<AudioMode>('UNKNOWN');
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOff, setIsSpeakerOff] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
    const [activeCallId, setActiveCallId] = useState<number | null>(null);
    const [summary, setSummary] = useState<CallSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sigStrength] = useState(Math.floor(Math.random() * 2) + 3); // 3-4 bars
    const [isAiSpeakingFallback, setIsAiSpeakingFallback] = useState(false);
    const [lastPacketTime, setLastPacketTime] = useState<number | null>(null);
    const [liveSeverity, setLiveSeverity] = useState('NORMAL');
    const [isReconnecting, setIsReconnecting] = useState(false);
    const reconnectAttemptsRef = useRef(0);

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const playbackCtxRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const activeCallIdRef = useRef<number | null>(null);
    const isSpeakingFallbackRef = useRef(false);
    const nextPlayTimeRef = useRef<number>(0);
    const voicesLoadedRef = useRef(false);
    const callStateRef = useRef<CallState>('IDLE');
    const pendingTurnCompleteRef = useRef(false); // set when backend signals turn_complete

    useEffect(() => { activeCallIdRef.current = activeCallId; }, [activeCallId]);
    useEffect(() => { isSpeakingFallbackRef.current = isAiSpeakingFallback; }, [isAiSpeakingFallback]);
    useEffect(() => { callStateRef.current = callState; }, [callState]);

    useEffect(() => {
        const text = transcript.map(t => t.text.toLowerCase()).join(' ');
        if (text.match(/(chest pain|breathing|emergency)/)) {
            setLiveSeverity('CRITICAL');
        } else if (text.match(/(fever|cold|headache)/)) {
            if (liveSeverity !== 'CRITICAL') setLiveSeverity('ELEVATED');
        } else {
            if (liveSeverity !== 'CRITICAL' && liveSeverity !== 'ELEVATED') setLiveSeverity('NORMAL');
        }
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript, liveSeverity]);

    // Pre-load Web Speech Synthesis voices (Chrome loads them async)
    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        const synth = window.speechSynthesis;
        if (!synth) return;
        const loadVoices = () => {
            const v = synth.getVoices();
            if (v.length > 0) voicesLoadedRef.current = true;
        };
        loadVoices();
        synth.addEventListener('voiceschanged', loadVoices);
        return () => synth.removeEventListener('voiceschanged', loadVoices);
    }, []);

    // ── Cleanup everything ──────────────────────────────────────────────────
    const cleanupAll = useCallback(() => {
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
        if (playbackCtxRef.current) { playbackCtxRef.current.close(); playbackCtxRef.current = null; }
        if (processorRef.current) { processorRef.current = null; }
        if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch { } recognitionRef.current = null; }
        if (synthRef.current) { synthRef.current.cancel(); }
    }, []);

    // ── Speak AI text via Web Speech Synthesis ─────────────────────────────
    const speakText = useCallback((text: string, onEnd?: () => void) => {
        if (isSpeakerOff) { onEnd?.(); return; }
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) { onEnd?.(); return; }
        const synth = window.speechSynthesis;
        if (!synth) { onEnd?.(); return; }
        synthRef.current = synth;
        try { synth.cancel(); } catch {}

        const doSpeak = () => {
            const utterance = new SpeechSynthesisUtterance(text);

            // Try to find a good English voice
            const voices = synth.getVoices();
            const preferred = voices.find(v =>
                v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Samantha'))
            ) || voices.find(v => v.lang.startsWith('en'));
            if (preferred) utterance.voice = preferred;

            utterance.rate = 0.92;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onstart = () => { setSpeechState('SPEAKING'); setIsAiSpeakingFallback(true); };
            utterance.onend = () => {
                setSpeechState('LISTENING');
                setIsAiSpeakingFallback(false);
                onEnd?.();
            };
            utterance.onerror = (e) => {
                console.warn('[TTS] SpeechSynthesis error:', e);
                setSpeechState('LISTENING');
                setIsAiSpeakingFallback(false);
                onEnd?.();
            };

            synth.speak(utterance);

            // Chrome bug: speechSynthesis can pause indefinitely on long text
            // Workaround: periodically resume
            const resumeInterval = setInterval(() => {
                if (!synth.speaking) { clearInterval(resumeInterval); return; }
                synth.pause();
                synth.resume();
            }, 10000);
            utterance.onend = () => {
                clearInterval(resumeInterval);
                setSpeechState('LISTENING');
                setIsAiSpeakingFallback(false);
                onEnd?.();
            };
        };

        // If voices aren't loaded yet, wait for them
        if (synth.getVoices().length === 0) {
            const onVoicesReady = () => {
                synth.removeEventListener('voiceschanged', onVoicesReady);
                doSpeak();
            };
            synth.addEventListener('voiceschanged', onVoicesReady);
            // Timeout fallback in case event never fires
            setTimeout(() => {
                synth.removeEventListener('voiceschanged', onVoicesReady);
                doSpeak();
            }, 500);
        } else {
            doSpeak();
        }
    }, [isSpeakerOff]);

    // ── Add transcript line ─────────────────────────────────────────────────
    const addLine = useCallback((role: 'user' | 'ai', text: string) => {
        setTranscript(prev => [...prev, { role, text: text.trim(), ts: Date.now() }]);
    }, []);

    // ── FALLBACK MODE: STT + LLM + TTS ─────────────────────────────────────
    const startFallbackMode = useCallback(async (callId: number) => {
        setAudioMode('FALLBACK');

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Voice recognition not supported in this browser. Please use Chrome.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';
        recognitionRef.current = recognition;

        const token = localStorage.getItem('access_token');

        const listenForUser = () => {
            if (!recognitionRef.current) return;
            try {
                setSpeechState('LISTENING');
                recognition.start();
            } catch { }
        };

        let finalText = '';

        recognition.onstart = () => setSpeechState('LISTENING');

        recognition.onresult = (e: any) => {
            let interim = '';
            finalText = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
                else interim += e.results[i][0].transcript;
            }
        };

        recognition.onspeechend = () => { recognition.stop(); };

        recognition.onend = async () => {
            const text = finalText.trim();
            if (!text) { listenForUser(); return; }

            addLine('user', text);
            setSpeechState('PROCESSING');

            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dignova-ai.onrender.com';
                const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/calls/${callId}/voice-text`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text, call_id: callId }),
                });

                if (!res.ok) throw new Error('AI response failed');

                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await res.json().catch(() => ({}));
                    addLine('ai', data.text);
                    setSpeechState('SPEAKING');
                    speakText(data.text, () => listenForUser());
                } else {
                    // Handle Streaming MP3 Audio Blob
                    const blob = await res.blob();
                    if (blob.size < 100) {
                        console.warn('[FALLBACK] Received near-empty audio blob. Missing OpenAI API Key?');
                        listenForUser();
                        return;
                    }
                    const audioUrl = URL.createObjectURL(blob);
                    const audio = new Audio(audioUrl);
                    
                    setSpeechState('SPEAKING');
                    
                    // Attempt to get text from header if available
                    const aiText = res.headers.get('X-AI-Transcript');
                    if (aiText) addLine('ai', aiText);
                    
                    audio.play().catch(err => {
                        console.error('[FALLBACK] Audio play error:', err);
                        listenForUser();
                    });
                    
                    audio.onended = () => {
                        setSpeechState('LISTENING');
                        listenForUser();
                        URL.revokeObjectURL(audioUrl);
                    };
                }
            } catch (err) {
                console.error('[FALLBACK] AI fetch error:', err);
                listenForUser();
            }
        };

        recognition.onerror = (e: any) => {
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
                console.warn('[STT] Error:', e.error);
            }
            setTimeout(listenForUser, 500);
        };

        // Kick off with AI greeting
        const greeting = "Hello! This is Dr. Dignova. I'm your AI doctor, and I'm here to help you right now. Please tell me — what's been bothering you today?";
        addLine('ai', greeting);
        setSpeechState('SPEAKING');
        speakText(greeting, () => listenForUser());
    }, [addLine, speakText]);

    // ── Pro Audio Playback (Raw PCM with Scheduling Queue) ────────────────
    const playProPCMAudio = useCallback(async (base64: string) => {
        // Use the dedicated playback context (native sample rate) instead of the 16kHz capture context
        const playCtx = playbackCtxRef.current;
        if (!playCtx || isSpeakerOff) return;

        try {
            // Resume if suspended (Chrome autoplay policy)
            if (playCtx.state === 'suspended') await playCtx.resume();

            const binaryString = window.atob(base64);
            const len = binaryString.length;

            // Fix potential Int16Array alignment issue
            const bufferLen = len % 2 === 0 ? len : len - 1;
            const bytes = new Uint8Array(bufferLen);
            for (let i = 0; i < bufferLen; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const int16Data = new Int16Array(bytes.buffer);

            // Convert Int16 PCM to Float32
            const floatData = new Float32Array(int16Data.length);
            for (let i = 0; i < int16Data.length; i++) {
                floatData[i] = int16Data[i] / (int16Data[i] < 0 ? 0x8000 : 0x7FFF);
            }

            // Resample from 16kHz source to the playback context's native sample rate
            const sourceSampleRate = 16000;
            const targetSampleRate = playCtx.sampleRate;

            let outputData: Float32Array;
            if (sourceSampleRate !== targetSampleRate) {
                // Use OfflineAudioContext for high-quality resampling
                const offlineCtx = new OfflineAudioContext(1, Math.ceil(floatData.length * targetSampleRate / sourceSampleRate), targetSampleRate);
                const srcBuffer = offlineCtx.createBuffer(1, floatData.length, sourceSampleRate);
                srcBuffer.getChannelData(0).set(floatData);
                const srcNode = offlineCtx.createBufferSource();
                srcNode.buffer = srcBuffer;
                srcNode.connect(offlineCtx.destination);
                srcNode.start();
                const rendered = await offlineCtx.startRendering();
                outputData = rendered.getChannelData(0);
            } else {
                outputData = floatData;
            }

            const buffer = playCtx.createBuffer(1, outputData.length, targetSampleRate);
            buffer.getChannelData(0).set(outputData);

            const source = playCtx.createBufferSource();
            source.buffer = buffer;

            const gainNode = playCtx.createGain();
            gainNode.gain.value = 1.0;
            source.connect(gainNode);
            gainNode.connect(playCtx.destination);

            setSpeechState('SPEAKING');

            // --- SCHEDULING ---
            const now = playCtx.currentTime;
            if (nextPlayTimeRef.current < now) {
                nextPlayTimeRef.current = now + 0.05; // Small lookahead
            }

            const scheduledStart = nextPlayTimeRef.current;
            source.start(scheduledStart);
            nextPlayTimeRef.current += buffer.duration;

            // When this buffer ends, check if the full audio queue has drained
            source.onended = () => {
                const stillPlaying = playbackCtxRef.current &&
                    nextPlayTimeRef.current > playbackCtxRef.current.currentTime + 0.05;
                if (!stillPlaying && pendingTurnCompleteRef.current) {
                    pendingTurnCompleteRef.current = false;
                    setSpeechState('LISTENING');
                }
            };
        } catch (e) {
            console.error('[LIVE] Playback error:', e);
        }
    }, [isSpeakerOff]);

    // ── LIVE MODE: Gemini Live WebSocket ───────────────────────────────────
    const startLiveMode = useCallback(async (callId: number) => {
        setAudioMode('LIVE');
        
        if (!audioCtxRef.current) {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioCtxRef.current = audioCtx;

            const playbackCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            playbackCtxRef.current = playbackCtx;
            console.log(`[LIVE] Playback context sample rate: ${playbackCtx.sampleRate}Hz`);
            
            try {
                await audioCtx.audioWorklet.addModule('/audio-processor.js');
                console.log('[LIVE] AudioWorklet loaded.');
            } catch (e) {
                console.warn('[LIVE] AudioWorklet module load skipped/fallback active:', e);
            }
        }

        const connectSocket = () => {
            let wsHost = 'dignova-ai.onrender.com';
            let protocol = 'wss:';
            if (typeof window !== 'undefined') {
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    wsHost = `${window.location.hostname}:8000`;
                    protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                }
            }

            console.log('[LIVE] Connecting to Sentient Custom Voice Agent:', `${protocol}//${wsHost}/ws/sentient-voice`);
            const socket = new WebSocket(`${protocol}//${wsHost}/ws/sentient-voice`);
            wsRef.current = socket;

            const connectTimeout = setTimeout(() => {
                if (socket.readyState !== WebSocket.OPEN) {
                    console.warn('[LIVE] Connection timeout');
                    socket.close();
                }
            }, 6000);

            socket.onopen = () => {
                clearTimeout(connectTimeout);
                setIsReconnecting(false);
                reconnectAttemptsRef.current = 0;
                console.log('[LIVE] Custom Voice Agent WebSocket Connected.');
                socket.send(JSON.stringify({ event: 'init', persona: 'TRIAGE', call_id: callId }));
                if (!streamRef.current) startProMicStreaming();
            };

            socket.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                if (data.event === 'error') {
                    setError(data.message);
                }
                if (data.event === 'audio' && data.payload) {
                    setLastPacketTime(Date.now());
                    try {
                        const audioUrl = `data:audio/mp3;base64,${data.payload}`;
                        const audio = new Audio(audioUrl);
                        setSpeechState('SPEAKING');
                        audio.play().catch(e => console.warn('[AUDIO] Play error:', e));
                        audio.onended = () => setSpeechState('LISTENING');
                    } catch {
                        playProPCMAudio(data.payload);
                    }
                }
                if (data.event === 'ai_response_chunk' && data.audio) {
                    setLastPacketTime(Date.now());
                    if (data.text) addLine('ai', data.text);
                    try {
                        const audioUrl = `data:audio/mp3;base64,${data.audio}`;
                        const audio = new Audio(audioUrl);
                        setSpeechState('SPEAKING');
                        audio.play().catch(e => console.warn('[AUDIO] Play error:', e));
                        audio.onended = () => setSpeechState('LISTENING');
                    } catch {}
                }
                if (data.event === 'transcript') {
                    console.log(`[LIVE] ${data.role} says:`, data.text);
                    const role = data.role as 'user' | 'ai';
                    const text = (data.text || '').trim();
                    if (text) addLine(role, text);
                }
                if (data.event === 'turn_complete') {
                    console.log('[LIVE] Turn complete received');
                    const playCtx = playbackCtxRef.current;
                    if (playCtx && nextPlayTimeRef.current > playCtx.currentTime + 0.05) {
                        pendingTurnCompleteRef.current = true;
                    } else {
                        setSpeechState('LISTENING');
                    }
                }
            };

            socket.onerror = () => {
                console.warn('[LIVE] WS error');
            };

            socket.onclose = (event) => {
                console.log(`[LIVE] WS Closed (code=${event.code}, reason=${event.reason}).`);
                if (callStateRef.current !== 'ENDED' && callStateRef.current !== 'IDLE') {
                    if (reconnectAttemptsRef.current >= 3) {
                        setIsReconnecting(false);
                        setCallState('ENDED');
                        setError('Connection lost. Please try again.');
                        cleanupAll();
                    } else {
                        const delays = [1000, 2000, 4000];
                        const delay = delays[reconnectAttemptsRef.current];
                        reconnectAttemptsRef.current += 1;
                        setIsReconnecting(true);
                        console.warn(`[LIVE] Reconnecting... Attempt ${reconnectAttemptsRef.current} in ${delay}ms`);
                        setTimeout(() => {
                            if (callStateRef.current !== 'ENDED' && callStateRef.current !== 'IDLE') {
                                connectSocket();
                            }
                        }, delay);
                    }
                }
            };
        };

        connectSocket();
    }, [addLine, startFallbackMode, cleanupAll, playProPCMAudio]);

    // ── Pro Audio Streaming (Worklet based) ───────────────────────────────
    const startProMicStreaming = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            streamRef.current = stream;

            const audioCtx = audioCtxRef.current!;
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            const source = audioCtx.createMediaStreamSource(stream);
            try {
                const workletNode = new AudioWorkletNode(audioCtx, 'dignova-audio-processor');
                workletNode.port.onmessage = (event) => {
                    if (event.data.event === 'capture') {
                        const b64 = btoa(String.fromCharCode(...new Uint8Array(event.data.buffer)));
                        const currentSocket = wsRef.current;
                        if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
                            currentSocket.send(JSON.stringify({ event: 'audio', payload: b64 }));
                        }
                    }
                };
                source.connect(workletNode);
                workletNode.connect(audioCtx.destination);
            } catch (workletErr) {
                console.warn('[LIVE] AudioWorklet not registered, falling back to ScriptProcessor:', workletErr);
                const processor = audioCtx.createScriptProcessor(4096, 1, 1);
                processorRef.current = processor;
                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcm16 = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                    }
                    const b64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
                    const currentSocket = wsRef.current;
                    if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
                        currentSocket.send(JSON.stringify({ event: 'audio', payload: b64 }));
                    }
                };
                source.connect(processor);
                processor.connect(audioCtx.destination);
            }
        } catch (err) {
            console.error('[LIVE] Mic error:', err);
            setError('Microphone access denied.');
        }
    };

    const testAudioSystem = async () => {
        try {
            if (typeof window === 'undefined') return;
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            if (ctx.state === 'suspended') await ctx.resume();
            
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.5);
            console.log('[AUDIO] System Test Pulse fired.');
            
            if ('speechSynthesis' in window) {
                const synth = window.speechSynthesis;
                if (synth) {
                    const testUtterance = new SpeechSynthesisUtterance('Audio system ready.');
                    testUtterance.volume = 0.3;
                    testUtterance.rate = 1.0;
                    const voices = synth.getVoices();
                    const enVoice = voices.find(v => v.lang.startsWith('en'));
                    if (enVoice) testUtterance.voice = enVoice;
                    synth.speak(testUtterance);
                    console.log(`[AUDIO] TTS Voices available: ${voices.length}`);
                }
            }
        } catch (err) {
            console.warn('[AUDIO] Test audio system warning:', err);
        }
    };

    // ── Start Call ─────────────────────────────────────────────────────────
    const startCall = async () => {
        // Resume any existing audio contexts (Chrome autoplay policy)
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            try { await audioCtxRef.current.resume(); } catch {}
        }
        if (playbackCtxRef.current && playbackCtxRef.current.state === 'suspended') {
            try { await playbackCtxRef.current.resume(); } catch {}
        }
        // Chrome workaround: calling cancel() before first speak prevents silent failure
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try { window.speechSynthesis?.cancel(); } catch {}
        }
        setError(null);
        setTranscript([]);
        setSummary(null);
        setCallState('RINGING');
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;

        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Not authenticated. Please log in.');

            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dignova-ai.onrender.com';
            const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/calls/start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: 0 }),
            });

            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.detail || 'Failed to start call');
            }

            const callData = await res.json().catch(() => ({}));
            setActiveCallId(callData.call_id);
            activeCallIdRef.current = callData.call_id;

            // Small delay for the ringing effect
            await new Promise(r => setTimeout(r, 1800));
            setCallState('CONNECTED');
            setSpeechState('PROCESSING');

            // Try Live mode first, fallback handled inside
            try {
                await startLiveMode(callData.call_id);
            } catch {
                await startFallbackMode(callData.call_id);
            }
        } catch (err: any) {
            setError(err.message || 'Could not start call');
            setCallState('IDLE');
        }
    };

    // ── End Call ───────────────────────────────────────────────────────────
    const endCall = async () => {
        const cid = activeCallIdRef.current;
        setSpeechState('IDLE');
        cleanupAll();
        setCallState('ENDED');

        if (cid) {
            try {
                const token = localStorage.getItem('access_token');
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dignova-ai.onrender.com';
                await fetch(`${baseUrl.replace(/\/$/, '')}/api/calls/${cid}/terminate`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                // Fetch summary
                const sRes = await fetch(`${baseUrl.replace(/\/$/, '')}/api/calls/${cid}/summary`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (sRes.ok) setSummary(await sRes.json().catch(() => ({})));
            } catch { }
        }
    };

    // ── Toggle mute ────────────────────────────────────────────────────────
    const toggleMute = () => {
        setIsMuted(m => {
            const next = !m;
            if (streamRef.current) {
                streamRef.current.getAudioTracks().forEach(t => { t.enabled = !next; });
            }
            return next;
        });
    };

    // ─────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className="voice-triage-root">
            <style>{`
                .voice-triage-root {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #080A0F;
                    font-family: 'Inter', system-ui, sans-serif;
                    padding: 1.5rem;
                }
                .call-card {
                    width: 100%;
                    max-width: 520px;
                    background: linear-gradient(160deg, rgba(14,16,22,0.97) 0%, rgba(8,10,15,0.99) 100%);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 32px;
                    overflow: hidden;
                    box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
                    position: relative;
                }
                .call-topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1.25rem 1.5rem 0;
                }
                .call-body {
                    padding: 2rem 2rem 1.5rem;
                }
                .transcript-box {
                    height: 180px;
                    overflow-y: auto;
                    background: rgba(0,0,0,0.45);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 20px;
                    padding: 1rem 1.25rem;
                    scroll-behavior: smooth;
                }
                .transcript-box::-webkit-scrollbar { width: 3px; }
                .transcript-box::-webkit-scrollbar-track { background: transparent; }
                .transcript-box::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                .ctrl-btn {
                    width: 56px; height: 56px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.05);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: white;
                }
                .ctrl-btn:hover { background: rgba(255,255,255,0.12); transform: scale(1.06); }
                .ctrl-btn.active { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); color: #ef4444; }
                .end-btn {
                    width: 72px; height: 72px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    background: #ef4444;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 8px 24px rgba(239,68,68,0.5);
                    transition: all 0.2s ease;
                    color: white;
                }
                .end-btn:hover { transform: scale(1.08); box-shadow: 0 12px 32px rgba(239,68,68,0.6); }
                .call-btn-main {
                    width: 96px; height: 96px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #10b981, #06b6d4);
                    border: none;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 12px 40px rgba(6,182,212,0.45), 0 0 0 16px rgba(6,182,212,0.06);
                    transition: all 0.25s ease;
                    color: white;
                    margin: 0 auto;
                }
                .call-btn-main:hover { transform: scale(1.08); box-shadow: 0 16px 48px rgba(6,182,212,0.55), 0 0 0 20px rgba(6,182,212,0.08); }
                .signal-dot {
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: #10b981;
                    animation: blink 1.8s ease-in-out infinite;
                }
                @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
                .mode-badge {
                    font-size: 9px;
                    font-family: 'JetBrains Mono', monospace;
                    font-weight: 700;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    padding: 2px 8px;
                    border-radius: 99px;
                    border: 1px solid;
                }
            `}</style>

            {/* ─── IDLE State ─────────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {callState === 'IDLE' && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                        className="call-card"
                    >
                        <div style={{ padding: '3rem 2rem 2.5rem', textAlign: 'center' }}>
                            {/* Header */}
                            <div style={{ marginBottom: '2.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                                    <div className="signal-dot" />
                                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                                        Sentient Medical Network
                                    </span>
                                </div>
                                <h1 style={{ fontSize: 32, fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
                                    Dr. Dignova
                                </h1>
                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                                    AI Clinical Physician · Available 24/7
                                </p>
                            </div>

                            {/* Avatar */}
                            <div style={{ marginBottom: '2.5rem' }}>
                                <AIOrb state="IDLE" />
                            </div>

                            {/* Capabilities */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '2.5rem', textAlign: 'left' }}>
                                {[
                                    { icon: <Stethoscope size={14} />, text: 'Real-time symptom assessment', color: '#06b6d4' },
                                    { icon: <Brain size={14} />, text: 'Multilingual — Hindi, English, Hinglish', color: '#a855f7' },
                                    { icon: <ShieldCheck size={14} />, text: 'Emergency escalation & booking', color: '#10b981' },
                                ].map(({ icon, text, color }, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ color }}>{icon}</span>
                                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{text}</span>
                                    </div>
                                ))}
                            </div>

                            {error && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertTriangle size={14} /> {error}
                                </motion.div>
                            )}

                            <button className="call-btn-main" onClick={startCall}>
                                <PhoneCall size={36} />
                            </button>
                            <p style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                                TAP TO CALL DR. DIGNOVA
                            </p>

                            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                                <button 
                                    onClick={testAudioSystem}
                                    style={{ padding: '8px 16px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 10, cursor: 'pointer', fontFamily: 'monospace' }}
                                >
                                    [ RUN AUDIO TEST PULSE ]
                                </button>
                                
                                {lastPacketTime && (
                                    <div style={{ fontSize: 9, color: '#10b981', fontFamily: 'monospace' }}>
                                        SENTIENT_DATA: STREAMING_ACTIVE ({new Date(lastPacketTime).toLocaleTimeString()})
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ─── RINGING State ──────────────────────────────────────────────── */}
                {callState === 'RINGING' && (
                    <motion.div
                        key="ringing"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="call-card"
                    >
                        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 8 }}>
                                Connecting
                            </p>
                            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 4 }}>Dr. Dignova</h2>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: '3rem' }}>AI Clinical Physician</p>

                            {/* Ringing rings */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3rem', height: 200 }}>
                                {[1, 1.6, 2.2, 2.8].map((scale, i) => (
                                    <motion.div
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            width: 100, height: 100,
                                            borderRadius: '50%',
                                            border: '2px solid rgba(6,182,212,0.6)',
                                        }}
                                        animate={{ scale: [1, scale], opacity: [0.7, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
                                    />
                                ))}
                                <div style={{
                                    width: 100, height: 100, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(139,92,246,0.2))',
                                    border: '2px solid rgba(6,182,212,0.6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative', zIndex: 10,
                                    boxShadow: '0 0 40px rgba(6,182,212,0.4)',
                                }}>
                                    <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}>
                                        <PhoneCall size={40} style={{ color: '#06b6d4' }} />
                                    </motion.div>
                                </div>
                            </div>

                            <motion.p
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}
                            >
                                Establishing secure uplink…
                            </motion.p>
                        </div>
                    </motion.div>
                )}

                {/* ─── CONNECTED State ────────────────────────────────────────────── */}
                {callState === 'CONNECTED' && (
                    <motion.div
                        key="connected"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                        className="call-card"
                    >
                        {/* Top bar */}
                        <div className="call-topbar">
                            <CallTimer running={callState === 'CONNECTED'} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <SeverityBadge level={liveSeverity} />
                                {audioMode !== 'UNKNOWN' && (
                                    <span className="mode-badge" style={{
                                        color: audioMode === 'LIVE' ? '#10b981' : '#f59e0b',
                                        borderColor: audioMode === 'LIVE' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)',
                                        background: audioMode === 'LIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                    }}>
                                        {audioMode === 'LIVE' ? '⚡ Live' : '🔊 Enhanced'}
                                    </span>
                                )}
                                {/* Signal bars */}
                                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                                    {[1, 2, 3, 4].map(b => (
                                        <div key={b} style={{ width: 3, borderRadius: 2, background: b <= sigStrength ? '#10b981' : 'rgba(255,255,255,0.15)', height: 4 + b * 3 }} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="call-body">
                            {/* Doctor info */}
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
                                    {isReconnecting ? '● RECONNECTING...' :
                                     speechState === 'SPEAKING' ? '● DOCTOR IS SPEAKING' :
                                     speechState === 'LISTENING' ? '● LISTENING TO YOU' :
                                     speechState === 'PROCESSING' ? '● THINKING…' : '● CONNECTED'}
                                </p>
                                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>Dr. Dignova</h2>
                            </div>

                            {/* AI Orb */}
                            <AIOrb state={speechState} />

                            {/* Waveform */}
                            <div style={{ display: 'flex', justifyContent: 'center', margin: '1.25rem 0' }}>
                                <WaveBars
                                    active={speechState === 'SPEAKING' || speechState === 'LISTENING'}
                                    color={speechState === 'SPEAKING' ? '#EC4899' : '#06b6d4'}
                                    count={32}
                                />
                            </div>

                            {/* Transcript */}
                            <div className="transcript-box" style={{ marginBottom: '1.5rem' }}>
                                {transcript.length === 0 && (
                                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: 'monospace', textAlign: 'center', marginTop: 60 }}>
                                        Waiting for the conversation to begin…
                                    </p>
                                )}
                                {transcript.map((line, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: line.role === 'ai' ? -8 : 8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3 }}
                                        style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', alignItems: line.role === 'ai' ? 'flex-start' : 'flex-end' }}
                                    >
                                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: line.role === 'ai' ? 'rgba(236,72,153,0.7)' : 'rgba(6,182,212,0.7)', letterSpacing: '0.1em', marginBottom: 3 }}>
                                            {line.role === 'ai' ? 'DR. DIGNOVA' : 'YOU'}
                                        </span>
                                        <div style={{
                                            maxWidth: '85%',
                                            padding: '8px 12px',
                                            borderRadius: line.role === 'ai' ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                                            background: line.role === 'ai' ? 'rgba(236,72,153,0.1)' : 'rgba(6,182,212,0.1)',
                                            border: `1px solid ${line.role === 'ai' ? 'rgba(236,72,153,0.2)' : 'rgba(6,182,212,0.2)'}`,
                                            fontSize: 12,
                                            color: 'rgba(255,255,255,0.85)',
                                            lineHeight: 1.5,
                                        }}>
                                            {line.text}
                                        </div>
                                    </motion.div>
                                ))}
                                <div ref={transcriptEndRef} />
                            </div>

                            {/* Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                                <button className={`ctrl-btn ${isMuted ? 'active' : ''}`} onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                                    {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                                </button>

                                <button className="end-btn" onClick={endCall} title="End Call">
                                    <PhoneOff size={28} />
                                </button>

                                <button className={`ctrl-btn ${isSpeakerOff ? 'active' : ''}`} onClick={() => { setIsSpeakerOff(s => !s); if (synthRef.current) synthRef.current.cancel(); }} title="Speaker">
                                    {isSpeakerOff ? <VolumeX size={22} /> : <Volume2 size={22} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ─── ENDED State ────────────────────────────────────────────────── */}
                {callState === 'ENDED' && (
                    <motion.div
                        key="ended"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="call-card"
                    >
                        <div style={{ padding: '2.5rem 2rem' }}>
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                    <PhoneOff size={24} style={{ color: '#ef4444' }} />
                                </div>
                                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 4 }}>Call Ended</h2>
                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                                    {summary ? `Duration: ${Math.floor(summary.duration_seconds / 60)}m ${summary.duration_seconds % 60}s` : 'Session complete'}
                                </p>
                            </div>

                            {summary ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Severity</span>
                                        <SeverityBadge level={summary.severity} />
                                    </div>

                                    <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
                                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>AI Assessment</p>
                                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>{summary.diagnosis}</p>
                                    </div>

                                    {summary.summary && (
                                        <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
                                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Summary</p>
                                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>{summary.summary}</p>
                                        </div>
                                    )}

                                    {summary.stress_level !== undefined && (
                                        <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Emotional Telemetry</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>Vocal Stress Index</span>
                                                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2, textTransform: 'capitalize' }}>Primary State: <strong style={{ color: summary.stress_level > 0.7 ? '#ef4444' : summary.stress_level > 0.4 ? '#f59e0b' : '#10b981' }}>{summary.primary_emotion || 'calm'}</strong></p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                                                        <div style={{ 
                                                            width: `${summary.stress_level * 100}%`, 
                                                            height: '100%', 
                                                            background: summary.stress_level > 0.7 ? '#ef4444' : summary.stress_level > 0.4 ? '#f59e0b' : '#10b981' 
                                                        }} />
                                                    </div>
                                                    <span style={{ 
                                                        fontSize: 12, 
                                                        fontWeight: 700, 
                                                        color: summary.stress_level > 0.7 ? '#ef4444' : summary.stress_level > 0.4 ? '#f59e0b' : '#10b981' 
                                                    }}>
                                                        {Math.round(summary.stress_level * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {summary.recommended_resource && summary.recommended_resource !== 'General' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'rgba(16,185,129,0.08)', borderRadius: 16, border: '1px solid rgba(16,185,129,0.2)' }}>
                                            <ShieldCheck size={18} style={{ color: '#10b981', flexShrink: 0 }} />
                                            <div>
                                                <p style={{ fontSize: 10, color: 'rgba(16,185,129,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Recommended</p>
                                                <p style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>{summary.recommended_resource} Unit Booked</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                                    Generating your assessment…
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12, marginTop: '2rem' }}>
                                <button
                                    onClick={() => { setCallState('IDLE'); setTranscript([]); setSummary(null); setError(null); }}
                                    style={{ flex: 1, padding: '14px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <PhoneCall size={16} /> New Call
                                </button>
                                <button
                                    onClick={() => window.location.href = '/user/history'}
                                    style={{ flex: 1, padding: '14px', borderRadius: 16, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    View History <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

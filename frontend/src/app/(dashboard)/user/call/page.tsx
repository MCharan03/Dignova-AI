'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { MessageSquare, PhoneCall, ShieldCheck, Zap, Brain, Activity } from 'lucide-react';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';

export default function TriageSelectionPage() {
    return (
        <div className="max-w-6xl mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh] space-y-12">
            <div className="text-center space-y-4">
                <SplitText text="SELECT UPLINK MODE" className="text-4xl font-black text-white tracking-tighter" />
                <BlurIn delay={0.2}>
                    <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.3em]">Choose your interaction protocol with the Sentient Core</p>
                </BlurIn>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
                {/* Option 1: Neural Chat */}
                <motion.div 
                    whileHover={{ scale: 1.02, translateY: -5 }}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <GlassCard 
                        className="p-10 h-full flex flex-col items-center text-center space-y-6 cursor-pointer border-accent-cyan/20 hover:border-accent-cyan/60 transition-all group"
                        onClick={() => window.location.href = '/user/chat-triage'}
                    >
                        <div className="p-6 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 group-hover:bg-accent-cyan/20 transition-all">
                            <MessageSquare size={48} className="text-accent-cyan" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Neural Chat Link</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">Discrete, text-based triage protocol. Ideal for rapid symptom documentation and AR-powered visual uploads.</p>
                        </div>
                        <ul className="text-[10px] font-mono text-accent-cyan/60 space-y-2 uppercase text-left w-full pt-4 border-t border-white/5">
                            <li className="flex items-center gap-2"><Zap size={12} /> Encrypted Text Pipeline</li>
                            <li className="flex items-center gap-2"><Zap size={12} /> AR Biometric Scanning</li>
                            <li className="flex items-center gap-2"><Zap size={12} /> Low Latency Response</li>
                        </ul>
                    </GlassCard>
                </motion.div>

                {/* Option 2: Sentient Voice Agent */}
                <motion.div 
                    whileHover={{ scale: 1.02, translateY: -5 }}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <GlassCard 
                        className="p-10 h-full flex flex-col items-center text-center space-y-6 cursor-pointer border-accent-magenta/20 hover:border-accent-magenta/60 transition-all group"
                        onClick={() => window.location.href = '/user/voice-triage'}
                    >
                        <div className="p-6 rounded-full bg-accent-magenta/10 border border-accent-magenta/20 group-hover:bg-accent-magenta/20 transition-all">
                            <Brain size={48} className="text-accent-magenta" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Sentient Voice Agent</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">High-fidelity audio interaction. Speak naturally with the AI Doctor for a more intuitive clinical assessment.</p>
                        </div>
                        <ul className="text-[10px] font-mono text-accent-magenta/60 space-y-2 uppercase text-left w-full pt-4 border-t border-white/5">
                            <li className="flex items-center gap-2"><Activity size={12} /> Real-time Audio Stream</li>
                            <li className="flex items-center gap-2"><Activity size={12} /> Natural Language Brain</li>
                            <li className="flex items-center gap-2"><Activity size={12} /> Professional AI Persona</li>
                        </ul>
                    </GlassCard>
                </motion.div>
            </div>

            <BlurIn delay={0.6}>
                <div className="flex items-center gap-4 text-[9px] font-mono text-gray-600 uppercase tracking-widest">
                    <ShieldCheck size={14} className="text-success" />
                    Secure_Node_Connection_v4.2 // Protocol_Standard_ISO_27001
                </div>
            </BlurIn>
        </div>
    );
}

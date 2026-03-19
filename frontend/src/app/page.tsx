'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView } from 'framer-motion';
import { TiltCard } from '../components/ui/TiltCard';
import {
  HeartPulse, Cpu, ExternalLink, Brain, Lock,
  Network, Eye, Layers, Clock, Zap, Radio,
  CheckCircle2, ArrowRight
} from 'lucide-react';

// ── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedValue({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (1800 / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(Math.floor(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <div ref={ref} className="tabular-nums">{val.toLocaleString()}{suffix}</div>;
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();

  const bootLines = [
    '▶ DIGNOVA AI LAYER — v4.2.0',
    '⚡ Initializing neural triage matrix...',
    '✓ Biometric sensor array online',
    '✓ EHR sync protocols established',
    '✓ 2,048 nodes synchronized',
    '✓ SYSTEM READY — All subsystems nominal',
  ];

  const features = [
    { icon: Eye, title: 'Passive Multimodal\nAwareness', desc: 'Dignova reads the environment continuously — synthesizing visual screen data and auditory cues to proactively understand medical contexts in real-time.', color: 'cyan', stat: '340ms', statLabel: 'Detection latency' },
    { icon: Layers, title: 'Deep OS\nIntegration', desc: 'A foundational layer — not just an app. Self-healing protocols, proactive resource management, emotional telemetry detecting user stress via voice and typing cadence.', color: 'purple', stat: '99.97%', statLabel: 'Node uptime' },
    { icon: Clock, title: 'Asynchronous\nAgency', desc: 'Assign complex workflow goals and Dignova executes them autonomously while you\'re away. Background triage, EHR syncing, predictive discharge — all completed before you return.', color: 'blue', stat: '18min', statLabel: 'Avg task completion' },
  ];

  const colors: Record<string, { border: string; text: string; bg: string; glow: string }> = {
    cyan:   { border: 'rgba(255,255,255,0.1)',   text: 'rgba(255,255,255,0.9)', bg: 'rgba(255,255,255,0.03)',   glow: '0 0 30px rgba(255,255,255,0.03)' },
    purple: { border: 'rgba(255,255,255,0.1)',   text: 'rgba(255,255,255,0.9)', bg: 'rgba(255,255,255,0.03)',   glow: '0 0 30px rgba(255,255,255,0.03)' },
    blue:   { border: 'rgba(255,255,255,0.1)',   text: 'rgba(255,255,255,0.9)', bg: 'rgba(255,255,255,0.03)',   glow: '0 0 30px rgba(255,255,255,0.03)' },
  };

  const telemetry = [
    { label: 'Core Latency', value: 12,    suffix: 'ms', icon: Cpu,       sub: 'Neural relay speed' },
    { label: 'Active Nodes', value: 2048,  suffix: '',   icon: Network,   sub: 'Secure connections' },
    { label: 'AI Accuracy',  value: 99,    suffix: '%',  icon: Brain,     sub: 'Diagnostic precision' },
    { label: 'Patients Saved', value: 12000, suffix: '+', icon: HeartPulse, sub: 'Global impact' },
  ];

  return (
    <main className="relative text-slate-200 z-10 w-full">
      {/* ── NAV ────────────────────────────────────────────────── */}
      <nav className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8 }}
          className="flex items-center justify-between gap-8 px-6 py-3 rounded-full border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl w-full max-w-[900px] pointer-events-auto"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/20 flex items-center justify-center">
              <HeartPulse color="white" size={14} className="opacity-80" />
            </div>
            <span className="font-normal text-lg tracking-wide text-white">
              Dignova <span className="text-white/40 font-mono">AI</span>
            </span>
          </div>
          <div className="hidden md:flex gap-7 text-[11px] font-semibold text-white/40 uppercase tracking-widest">
            {['Features', 'Telemetry', 'System'].map(item => (
              <span key={item} className="cursor-pointer hover:text-white transition-colors">
                {item}
              </span>
            ))}
          </div>
          <button 
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/5 text-white font-semibold text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white hover:text-black transition-all"
          >
            Terminal <ExternalLink size={12} />
          </button>
        </motion.div>
      </nav>

      {/* ── SECTION 1: HERO ─────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col justify-center items-center text-center px-4 pt-28 pb-20 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-10"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em]">Diagnostic Matrix Online</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1, delay: 0.2 }}
          className="text-[clamp(3rem,10vw,7.5rem)] font-light tracking-tighter leading-none mb-6 uppercase"
        >
          <span className="text-white block opacity-90">AUTONOMOUS</span>
          <span className="text-white/30 block">TRIAGE CORE</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 1, delay: 0.5 }}
          className="max-w-[520px] text-lg text-slate-400 leading-relaxed mb-10"
        >
          A sentient operating layer for emergency medicine. Biometric telemetry meets agentic workflow intelligence.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex gap-4 flex-wrap justify-center"
        >
          <button 
            onClick={() => router.push('/login')}
            className="px-8 py-4 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-sm uppercase tracking-widest shadow-[0_0_40px_rgba(6,182,212,0.35)] hover:scale-105 transition-transform"
          >
            Enter System <Lock size={14} className="inline ml-1.5 mb-0.5" />
          </button>
          <button 
            onClick={() => router.push('/login?role=admin')}
            className="px-8 py-4 rounded-full bg-transparent text-white font-bold text-sm border border-white/15 uppercase tracking-widest hover:bg-white/5 transition-colors"
          >
            Admin Override
          </button>
        </motion.div>

        {/* Scroll cue */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Scroll to explore</span>
          <ArrowRight size={14} className="text-slate-500/60 rotate-90 animate-bounce" />
        </motion.div>
      </section>

      {/* ── SECTION 2: FEATURES ─────────────────────────────────── */}
      <section className="min-h-screen flex flex-col justify-center px-6 md:px-12 max-w-[1100px] mx-auto w-full py-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.7 }} 
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[11px] font-bold uppercase tracking-widest mb-4">
            <Zap size={10} /> Sentient OS Capabilities
          </div>
          <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-normal tracking-tight text-white leading-[1.1] uppercase">
            Not an app.<br />
            <span className="text-white/30">A foundation layer.</span>
          </h2>
        </motion.div>

        <div className="flex flex-col gap-4">
          {features.map((feat, i) => {
            const c = colors[feat.color];
            return (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, x: i % 2 === 0 ? -60 : 60 }} 
                whileInView={{ opacity: 1, x: 0 }} 
                transition={{ duration: 0.8, delay: i * 0.1 }} 
                viewport={{ once: true, margin: '-40px' }}
              >
                <TiltCard intensity={8}>
                  <div className="rounded-[20px] border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl p-7 md:p-8 flex items-center gap-6">
                    <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <feat.icon color={c.text} size={28} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2 tracking-tight whitespace-pre-line">{feat.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-2xl font-black text-white/90 font-mono tracking-tighter">{feat.stat}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{feat.statLabel}</div>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 3: LIVE TELEMETRY ────────────────────────────── */}
      <section className="min-h-screen flex flex-col justify-center px-6 md:px-12 max-w-[1100px] mx-auto w-full py-20">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.7 }} 
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[11px] font-bold uppercase tracking-widest mb-4">
            <Radio size={10} className="animate-pulse" /> Live Global Telemetry
          </div>
          <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-normal tracking-tight text-white leading-[1.1] uppercase">
            Real-time<br />
            <span className="text-white/30">Intelligence Feed</span>
          </h2>
        </motion.div>

        {/* Ticker */}
        <div className="overflow-hidden border-y border-white/5 py-2.5 mb-10">
          <div className="ticker-track flex gap-16 whitespace-nowrap w-max">
            {Array(3).fill(['CORE_LATENCY: 12ms','NODE_COUNT: 2,048','AI_ACCURACY: 99.9%','UPTIME: 99.97%','TRIAGE_QUEUE: 0','EHR_SYNC: ACTIVE','MEMORY_USAGE: 42%','PREDICTIONS: 18,204']).flat().map((item, i) => (
              <span key={i} className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
                <span className="text-white/10 mr-2">/</span> {item}
              </span>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {telemetry.map((stat, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 40, scale: 0.9 }} 
              whileInView={{ opacity: 1, y: 0, scale: 1 }} 
              transition={{ duration: 0.6, delay: i * 0.1, type: 'spring', stiffness: 60 }} 
              viewport={{ once: true, margin: '-40px' }}
            >
              <TiltCard intensity={12}>
                <div className="rounded-[20px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-8 text-center">
                  <stat.icon className="text-white/40 mb-5 mx-auto" size={20} />
                  <div className="text-3xl font-black text-white font-mono tracking-tighter">
                    <AnimatedValue target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mt-3 mb-1">{stat.label}</div>
                  <div className="text-[9px] text-white/20 uppercase tracking-widest">{stat.sub}</div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* Health monitor */}
        <div className="rounded-[20px] border border-white/5 bg-white/[0.02] backdrop-blur-xl p-7 md:px-8 relative overflow-hidden">
          <div className="scan-sweep absolute inset-0 pointer-events-none" />
          <div className="flex justify-between items-center mb-4">
            <span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">SYSTEM_HEALTH_MONITOR</span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
              <CheckCircle2 size={11} /> All systems nominal
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{ label: 'Neural Core', pct: 78 }, { label: 'Sync Bus', pct: 91 }, { label: 'Triage AI', pct: 64 }].map((bar, i) => (
              <div key={i}>
                <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase tracking-widest mb-2">
                  <span>{bar.label}</span><span>{bar.pct}%</span>
                </div>
                <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    whileInView={{ width: `${bar.pct}%` }} 
                    transition={{ duration: 1.2, delay: i * 0.2 }} 
                    viewport={{ once: true }}
                    className="h-full bg-white/40 rounded-full" 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: TERMINAL CTA ──────────────────────────────── */}
      <section className="min-h-screen flex flex-col justify-center items-center px-4 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 80 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.9, type: 'spring', bounce: 0.25 }} 
          viewport={{ once: true }}
          className="w-full max-w-[680px]"
        >
          <TiltCard intensity={5}>
            <div className="rounded-[28px] border border-cyan-500/20 bg-black/60 backdrop-blur-3xl shadow-2xl overflow-hidden">
              {/* Terminal bar */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                {['#ef4444','#f59e0b','#10b981'].map((c, i) => <div key={i} className="w-2.5 h-2.5 rounded-full opacity-70" style={{ background: c }} />)}
                <span className="ml-3 text-[10px] font-mono text-slate-500 tracking-widest">dignova-ai — system_boot.sh</span>
              </div>

              <div className="px-10 py-12 flex flex-col items-center text-center gap-8">
                <div>
                  <Brain size={48} className="text-purple-500 mx-auto mb-5 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
                  <h3 className="text-[clamp(2rem,5vw,3rem)] font-black text-white tracking-tighter mb-3 uppercase">Initialize Triage System</h3>
                  <p className="text-slate-400 text-base leading-relaxed max-w-[440px]">
                    The core is online and awaiting authorization. Connect securely to access the full sentient layer.
                  </p>
                </div>

                <div className="p-6 bg-white/[0.02] rounded-xl border border-white/5 w-full text-left font-mono text-[11px] text-white/50 leading-relaxed">
                  {bootLines.map((line, i) => (
                    <div key={i} className={`flex gap-3 ${i === 0 ? 'text-white/80' : 'opacity-70'}`}>
                      <span className="text-white/20">{`0${i + 1}`}</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-4 w-full max-w-[340px]">
                  <button 
                    onClick={() => router.push('/login')}
                    className="py-4 rounded-full bg-white text-black font-bold text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-colors"
                  >
                    Secure Login <Lock size={12} className="inline ml-1 opacity-40 mb-0.5" />
                  </button>
                  <button 
                    onClick={() => router.push('/login?role=admin')}
                    className="py-4 rounded-full bg-transparent text-white/60 font-bold text-xs border border-white/10 uppercase tracking-[0.2em] hover:bg-white/5 transition-colors"
                  >
                    Admin Override
                  </button>
                </div>
              </div>
            </div>
          </TiltCard>
        </motion.div>
      </section>

      {/* Footer */}
      <div className="text-center py-8 text-[9px] font-mono text-slate-600 border-t border-white/5 uppercase tracking-[0.3em]">
        DIGNOVA AI LAYER v4.2.0 — © 2026 — ZERO-GRAVITY TRIAGE MATRIX
      </div>
    </main>
  );
}

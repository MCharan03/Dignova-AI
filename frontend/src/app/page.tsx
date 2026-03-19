'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll } from '@react-three/drei';
import { motion, useInView } from 'framer-motion';
import { AntiGravityNodes } from '../components/3d/AntiGravityNodes';
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

// Removed TypewriterLog due to intermittent mounting crashes in strict mode and changing aesthetic goals.

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
    <div style={{ width: '100vw', height: '100vh', background: 'transparent', overflowY: 'auto', position: 'relative' }}>
      <main style={{ position: 'relative', color: '#e2e8f0', zIndex: 10 }}>


              {/* ── NAV ────────────────────────────────────────────────── */}
              <nav style={{ position: 'fixed', top: 20, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center', padding: '0 16px', pointerEvents: 'none' }}>
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, padding: '12px 24px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', width: '100%', maxWidth: 900, pointerEvents: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <HeartPulse color="white" size={14} style={{ opacity: 0.8 }} />
                    </div>
                    <span style={{ fontWeight: 400, fontSize: 18, letterSpacing: '0.04em', color: 'white' }}>
                      Dignova <span style={{ color: 'rgba(255,255,255,0.4)' }}>AI</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 28, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {['Features', 'Telemetry', 'System'].map(item => (
                      <span key={item} style={{ cursor: 'pointer', transition: 'color 0.3s ease' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => router.push('/login')}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 9999, background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.3s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'black'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; }}>
                    Terminal <ExternalLink size={12} />
                  </button>
                </motion.div>
              </nav>

              {/* ── SECTION 1: HERO ─────────────────────────────────────── */}
              <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '112px 16px 80px', position: 'relative' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '8px 20px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', marginBottom: 40 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }} />
                  <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Diagnostic Matrix Online</span>
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }}
                  style={{ fontSize: 'clamp(3rem, 10vw, 7.5rem)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 24, textTransform: 'uppercase' }}>
                  <span style={{ color: 'white', display: 'block', opacity: 0.9 }}>AUTONOMOUS</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block' }}>
                    TRIAGE CORE
                  </span>
                </motion.h1>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }}
                  style={{ maxWidth: 520, fontSize: 18, color: 'rgba(148,163,184,1)', lineHeight: 1.7, marginBottom: 40 }}>
                  A sentient operating layer for emergency medicine. Biometric telemetry meets agentic workflow intelligence.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7 }}
                  style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button onClick={() => router.push('/login')}
                    style={{ padding: '14px 32px', borderRadius: 9999, background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 0 40px rgba(6,182,212,0.35)', transition: 'all 0.3s' }}>
                    Enter System <Lock size={14} style={{ display: 'inline', marginLeft: 6 }} />
                  </button>
                  <button onClick={() => router.push('/login?role=admin')}
                    style={{ padding: '14px 28px', borderRadius: 9999, background: 'transparent', color: 'white', fontWeight: 700, fontSize: 14, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'all 0.3s' }}>
                    Admin Override
                  </button>
                </motion.div>

                {/* Scroll cue */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
                  style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'rgba(100,116,139,1)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Scroll to explore</span>
                  <ArrowRight size={14} color="rgba(100,116,139,0.6)" style={{ transform: 'rotate(90deg)', animation: 'bounce 2s infinite' }} />
                </motion.div>
              </section>

              {/* ── SECTION 2: FEATURES ─────────────────────────────────── */}
              <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 48px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true, margin: '-80px' }}
                  style={{ textAlign: 'center', marginBottom: 60 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 9999, border: '1px solid rgba(6,182,212,0.2)', background: 'rgba(6,182,212,0.05)', color: '#06b6d4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>
                    <Zap size={10} /> Sentient OS Capabilities
                  </div>
                  <h2 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)', fontWeight: 400, letterSpacing: '-0.02em', color: 'white', lineHeight: 1.1, textTransform: 'uppercase' }}>
                    Not an app.<br />
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>A foundation layer.</span>
                  </h2>
                </motion.div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {features.map((feat, i) => {
                    const c = colors[feat.color];
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -60 : 60 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: i * 0.1 }} viewport={{ once: true, margin: '-40px' }}>
                        <TiltCard intensity={8}>
                          <div style={{ borderRadius: 20, border: `1px solid ${c.border}`, background: 'rgba(5,5,20,0.7)', backdropFilter: 'blur(20px)', boxShadow: c.glow, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24 }}>
                            <div style={{ width: 60, height: 60, borderRadius: 16, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <feat.icon color={c.text} size={28} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <h3 style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 8, letterSpacing: '-0.03em', whiteSpace: 'pre-line' }}>{feat.title}</h3>
                              <p style={{ fontSize: 14, color: 'rgba(148,163,184,0.9)', lineHeight: 1.7 }}>{feat.desc}</p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 28, fontWeight: 900, color: c.text, fontFamily: 'monospace' }}>{feat.stat}</div>
                              <div style={{ fontSize: 11, color: 'rgba(100,116,139,1)', marginTop: 2 }}>{feat.statLabel}</div>
                            </div>
                          </div>
                        </TiltCard>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* ── SECTION 3: LIVE TELEMETRY ────────────────────────────── */}
              <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 48px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true, margin: '-80px' }}
                  style={{ textAlign: 'center', marginBottom: 50 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 9999, border: '1px solid rgba(6,182,212,0.2)', background: 'rgba(6,182,212,0.05)', color: '#06b6d4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>
                    <Radio size={10} style={{ animation: 'pulse 2s infinite' }} /> Live Global Telemetry
                  </div>
                  <h2 style={{ fontSize: 'clamp(2.5rem,6vw,4rem)', fontWeight: 400, letterSpacing: '-0.02em', color: 'white', lineHeight: 1.1, textTransform: 'uppercase' }}>
                    Real-time<br />
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Intelligence Feed</span>
                  </h2>
                </motion.div>

                {/* Ticker */}
                <div style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '10px 0', marginBottom: 40 }}>
                  <div className="ticker-track" style={{ display: 'flex', gap: 64, whiteSpace: 'nowrap', width: 'max-content' }}>
                    {Array(3).fill(['CORE_LATENCY: 12ms','NODE_COUNT: 2,048','AI_ACCURACY: 99.9%','UPTIME: 99.97%','TRIAGE_QUEUE: 0','EHR_SYNC: ACTIVE','MEMORY_USAGE: 42%','PREDICTIONS: 18,204']).flat().map((item, i) => (
                      <span key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span> {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
                  {telemetry.map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 40, scale: 0.9 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, delay: i * 0.1, type: 'spring', stiffness: 60 }} viewport={{ once: true, margin: '-40px' }}>
                      <TiltCard intensity={12}>
                        <div style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', padding: '32px 20px', textAlign: 'center' }}>
                          <stat.icon color="rgba(255,255,255,0.6)" size={20} style={{ margin: '0 auto 20px' }} />
                          <div style={{ fontSize: 36, fontWeight: 400, color: 'white', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
                            <AnimatedValue target={stat.value} suffix={stat.suffix} />
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '8px 0 4px' }}>{stat.label}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{stat.sub}</div>
                        </div>
                      </TiltCard>
                    </motion.div>
                  ))}
                </div>

                {/* Health monitor */}
                <div style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
                  <div className="scan-sweep" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(100,116,139,0.7)' }}>SYSTEM_HEALTH_MONITOR</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#10b981' }}>
                      <CheckCircle2 size={11} /> All systems nominal
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                    {[{ label: 'Neural Core', pct: 78 }, { label: 'Sync Bus', pct: 91 }, { label: 'Triage AI', pct: 64 }].map((bar, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'monospace', color: 'rgba(100,116,139,0.8)', marginBottom: 6 }}>
                          <span>{bar.label}</span><span>{bar.pct}%</span>
                        </div>
                        <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 9999, overflow: 'hidden' }}>
                          <motion.div initial={{ width: 0 }} whileInView={{ width: `${bar.pct}%` }} transition={{ duration: 1.2, delay: i * 0.2 }} viewport={{ once: true }}
                            style={{ height: '100%', background: 'rgba(255,255,255,0.6)', borderRadius: 9999 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ── SECTION 4: TERMINAL CTA ──────────────────────────────── */}
              <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '80px 16px' }}>
                <motion.div initial={{ opacity: 0, y: 80 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, type: 'spring', bounce: 0.25 }} viewport={{ once: true }}
                  style={{ width: '100%', maxWidth: 680 }}>
                  <TiltCard intensity={5}>
                    <div style={{ borderRadius: 28, border: '1px solid rgba(6,182,212,0.2)', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(24px)', boxShadow: '0 0 120px rgba(6,182,212,0.08)', overflow: 'hidden' }}>
                      {/* Terminal bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                        {['#ef4444','#f59e0b','#10b981'].map((c, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
                        <span style={{ marginLeft: 10, fontSize: 11, fontFamily: 'monospace', color: 'rgba(100,116,139,0.6)' }}>dignova-ai — system_boot.sh</span>
                      </div>

                      <div style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 32 }}>
                        <div>
                          <Brain size={48} color="#a855f7" style={{ margin: '0 auto 20px', filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.5))' }} />
                          <h3 style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.04em', marginBottom: 12 }}>Initialize Triage System</h3>
                          <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: 16, lineHeight: 1.7, maxWidth: 440 }}>
                            The core is online and awaiting authorization. Connect securely to access the full sentient layer.
                          </p>
                        </div>

                        <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', width: '100%', textAlign: 'left', fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
                          {bootLines.map((line, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, opacity: i === 0 ? 1 : 0.7 }}>
                              <span style={{ color: 'rgba(255,255,255,0.3)' }}>{`0${i + 1}`}</span>
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 340 }}>
                          <button onClick={() => router.push('/login')}
                            style={{ padding: '16px 32px', borderRadius: 9999, background: 'white', color: 'black', fontWeight: 500, fontSize: 12, border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.15em', transition: 'opacity 0.2s' }}>
                            Secure Login <Lock size={12} style={{ display: 'inline', marginLeft: 6, opacity: 0.6 }} />
                          </button>
                          <button onClick={() => router.push('/login?role=admin')}
                            style={{ padding: '15px 28px', borderRadius: 9999, background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontSize: 11, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                            Admin Override
                          </button>
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              </section>

              {/* Footer */}
              <div style={{ textAlign: 'center', padding: '24px', fontSize: 10, fontFamily: 'monospace', color: 'rgba(100,116,139,0.4)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                DIGNOVA AI LAYER v4.2.0 — © 2026 — ZERO-GRAVITY TRIAGE MATRIX
              </div>

            </main>
          </Scroll>
        </ScrollControls>
      </Canvas>
    </div>
  );
}


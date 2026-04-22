'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, Brain } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

type Question = {
  id: string;
  scenario: string;
  options: { id: string; text: string; score: number }[];
};

const examQuestions: Question[] = [
  {
    id: 'q1',
    scenario: 'A 55-year-old male arrives complaining of crushing chest pain radiating to his left arm, diaphoresis, and shortness of breath. No previous cardiac history. What is the immediate first step in triage?',
    options: [
      { id: 'a', text: 'Administer 324mg aspirin, obtain an ECG within 10 minutes, and activate the STEMI protocol if indicated.', score: 10 },
      { id: 'b', text: 'Send to the waiting room and schedule an ECG within the next hour.', score: 0 },
      { id: 'c', text: 'Administer an antacid to rule out GERD immediately.', score: 0 },
      { id: 'd', text: 'Obtain a full medical history regarding family cardiac events before moving the patient to a bed.', score: 2 },
    ]
  },
  {
    id: 'q2',
    scenario: 'A trauma patient is brought in by ambulance after a high-speed MVC. They are unresponsive. According to ATLS guidelines, what is your primary assessment priority?',
    options: [
      { id: 'a', text: 'Circulation and hemorrhage control.', score: 4 },
      { id: 'b', text: 'Airway maintenance with cervical spine restriction.', score: 10 },
      { id: 'c', text: 'Disability and neurological status.', score: 0 },
      { id: 'd', text: 'Exposure/Environmental control.', score: 0 },
    ]
  },
  {
    id: 'q3',
    scenario: 'A mother brings in her 3-year-old child who has a fever of 103°F, is lethargic, and has a new petechial rash on their torso. What is your triage level assignment?',
    options: [
      { id: 'a', text: 'Level 3 (Urgent) — Treat in next 30 minutes.', score: 0 },
      { id: 'b', text: 'Level 4 (Less Urgent) — Advise Tylenol and wait.', score: 0 },
      { id: 'c', text: 'Level 2 (Emergent) — Requires immediate assessment by an MD but not actively dying.', score: 3 },
      { id: 'd', text: 'Level 1 (Resuscitation) — Suspected meningococcemia. Isolate and immediate physician intervention.', score: 10 },
    ]
  }
];

type Props = {
  onComplete: (tier: 'intern' | 'mid_range' | 'experienced') => void;
  onCancel: () => void;
};

export function DoctorTriageExam({ onComplete, onCancel }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [resultTier, setResultTier] = useState<'intern' | 'mid_range' | 'experienced' | null>(null);

  const q = examQuestions[currentIdx];

  const handleSelect = (optionScore: number) => {
    setAnswers(prev => ({ ...prev, [q.id]: optionScore }));
    
    if (currentIdx < examQuestions.length - 1) {
      setCurrentIdx(curr => curr + 1);
    } else {
      evaluateScore({...answers, [q.id]: optionScore});
    }
  };

  const evaluateScore = (finalAnswers: Record<string, number>) => {
    setIsEvaluating(true);
    
    const totalScore = Object.values(finalAnswers).reduce((acc, curr) => acc + curr, 0);
    const maxScore = examQuestions.length * 10;
    const percentage = (totalScore / maxScore) * 100;
    
    let tier: 'intern' | 'mid_range' | 'experienced' = 'intern';
    if (percentage > 85) tier = 'experienced';
    else if (percentage >= 50) tier = 'mid_range';
    else tier = 'intern';
    
    setTimeout(() => {
      setResultTier(tier);
      setIsEvaluating(false);
    }, 2500); // Simulate matrix calculation delay
  };

  if (isEvaluating) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
        <GlassCard className="w-full max-w-md p-10 flex flex-col items-center text-center">
          <Brain size={48} className="text-accent-cyan animate-pulse mb-6 opacity-80" />
          <h2 className="text-2xl font-light tracking-tight text-white mb-2 uppercase">Neural Assessment Active</h2>
          <p className="text-sm text-gray-400 font-mono tracking-widest">CALCULATING DIAGNOSTIC ACCURACY...</p>
          <div className="w-full h-1 bg-white/10 mt-8 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: "100%" }} 
              transition={{ duration: 2.5, ease: "easeInOut" }}
              className="h-full bg-white/70 rounded-full"
            />
          </div>
        </GlassCard>
      </div>
    );
  }

  if (resultTier) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
          <GlassCard className="p-10 flex flex-col items-center text-center border-white/20">
            <CheckCircle2 size={48} className="text-white opacity-90 mb-6" />
            <h2 className="text-3xl font-light tracking-tight text-white mb-2 uppercase">Clearance Granted</h2>
            <p className="text-sm text-gray-300 mb-8 border-b border-white/10 pb-6 w-full">
              Your triage diagnostic signature marks you as:
            </p>
            <div className="text-4xl font-mono text-white tracking-widest uppercase mb-8">
              {resultTier.replace('_', ' ')}
            </div>
            <GlassButton variant="primary" className="w-full justify-center bg-white text-black hover:bg-gray-200" onClick={() => onComplete(resultTier)}>
              Initialize Node <ArrowRight size={16} className="ml-2" />
            </GlassButton>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <motion.div 
        initial={{ y: 40, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: -40, opacity: 0 }}
        className="w-full max-w-2xl"
      >
        <GlassCard className="p-8 border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
            <motion.div 
              className="h-full bg-white/40" 
              initial={{ width: `${(currentIdx / examQuestions.length) * 100}%` }}
              animate={{ width: `${((currentIdx + 1) / examQuestions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex justify-between items-center mb-8 mt-2">
            <div className="flex items-center gap-3">
              <ShieldAlert size={20} className="text-white/60" />
              <span className="text-xs font-mono text-white/50 tracking-[0.2em] uppercase">Diagnostic Matrix Authentication</span>
            </div>
            <span className="text-xs font-mono text-white/40">SCENARIO {currentIdx + 1}/{examQuestions.length}</span>
          </div>

          <h3 className="text-xl leading-relaxed text-white/90 mb-8 font-light">
            {q.scenario}
          </h3>

          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {q.options.map((opt, i) => (
                <motion.button
                  key={opt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => handleSelect(opt.score)}
                  className="w-full text-left p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/20 transition-all text-sm text-gray-300 leading-relaxed cursor-pointer"
                >
                  <span className="inline-block w-6 text-white/30 font-mono text-xs">{opt.id.toUpperCase()}.</span> {opt.text}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-8 text-center">
            <button onClick={onCancel} className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors">
              Abort Sequence
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}


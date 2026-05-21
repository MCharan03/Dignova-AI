'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, FileText, Calendar, Activity, ChevronRight, Sparkles } from 'lucide-react';

interface TimelineEvent {
    type: 'call' | 'prescription' | 'appointment' | 'prediction';
    date: string;
    title: string;
    details: string;
    id: number;
}

interface MedicalTimelineProps {
    events: TimelineEvent[];
}

const getIcon = (type: string) => {
    switch (type) {
        case 'call': return <Activity className="text-accent-cyan" size={18} />;
        case 'prescription': return <FileText className="text-accent-blue" size={18} />;
        case 'appointment': return <Calendar className="text-purple-400" size={18} />;
        case 'prediction': return <Sparkles className="text-amber-400" size={18} />;
        default: return <Activity size={18} />;
    }
};

export function MedicalTimeline({ events }: MedicalTimelineProps) {
    const allEvents = React.useMemo(() => {
        const predictions: TimelineEvent[] = [
            {
                id: 999,
                type: 'prediction',
                date: new Date(Date.now() + 86400000 * 3).toISOString(), // Tomorrow
                title: "AI PREDICTIVE INSIGHT",
                details: "Based on recent SpO2 and heart rate stability, Dignova predicts a 92% recovery completion within 72 hours. Proactive check-up scheduled."
            }
        ];
        return [...events, ...predictions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [events]);

    const hasHistory = events && events.length > 0;

    return (
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-accent-cyan/50 before:via-accent-blue/50 before:to-transparent">
            {!hasHistory && (
                <div className="text-center py-6 border border-dashed border-white/5 rounded-xl mb-8">
                    <p className="text-gray-500 font-mono text-[9px] uppercase tracking-[0.3em]">Neural_History_Baseline_Empty</p>
                </div>
            )}
            {allEvents.map((event, index) => {
                const isPrediction = event.type === 'prediction';
                return (
                <motion.div 
                    key={`${event.type}-${event.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex items-start group"
                >
                    <div className={`absolute left-0 mt-1 w-10 h-10 rounded-full bg-black border ${isPrediction ? 'border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'border-white/10'} flex items-center justify-center z-10 group-hover:border-accent-cyan/50 transition-colors`}>
                        {getIcon(event.type)}
                    </div>
                    
                    <div className={`ml-14 flex-1 bg-white/5 border ${isPrediction ? 'border-dashed border-amber-500/30 bg-amber-500/5 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]' : 'border-white/10'} rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group-hover:translate-x-1`}>
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-[10px] font-mono ${isPrediction ? 'text-amber-500' : 'text-gray-500'} uppercase tracking-tighter`}>
                                {isPrediction ? "PREDICTED_FUTURE_EVENT" : `${new Date(event.date).toLocaleDateString()} @ ${new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                            <ChevronRight size={14} className={`text-gray-600 group-hover:text-accent-cyan transition-colors ${isPrediction ? 'hidden' : ''}`} />
                        </div>
                        <h4 className={`text-sm font-bold ${isPrediction ? 'text-amber-400' : 'text-white'} mb-1 group-hover:text-accent-cyan transition-colors`}>{event.title}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">{event.details}</p>
                    </div>
                </motion.div>
            )})}
        </div>
    );
}

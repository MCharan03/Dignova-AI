'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CallBell, FileText, Calendar, Activity, ChevronRight } from 'lucide-react';

interface TimelineEvent {
    type: 'call' | 'prescription' | 'appointment';
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
        default: return <Activity size={18} />;
    }
};

export function MedicalTimeline({ events }: MedicalTimelineProps) {
    if (!events || events.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">No_Medical_Events_Found</p>
            </div>
        );
    }

    return (
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-accent-cyan/50 before:via-accent-blue/50 before:to-transparent">
            {events.map((event, index) => (
                <motion.div 
                    key={`${event.type}-${event.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex items-start group"
                >
                    <div className="absolute left-0 mt-1 w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center z-10 group-hover:border-accent-cyan/50 transition-colors">
                        {getIcon(event.type)}
                    </div>
                    
                    <div className="ml-14 flex-1 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer group-hover:translate-x-1">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter">
                                {new Date(event.date).toLocaleDateString()} @ {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <ChevronRight size={14} className="text-gray-600 group-hover:text-accent-cyan transition-colors" />
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1 group-hover:text-accent-cyan transition-colors">{event.title}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">{event.details}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

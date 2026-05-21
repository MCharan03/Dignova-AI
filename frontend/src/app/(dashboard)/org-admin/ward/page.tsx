'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { 
    Activity, Users, Map, Info, AlertTriangle, 
    CheckCircle, Home, Layout, Box, Zap, Search,
    ChevronRight, X, User
} from 'lucide-react';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';

interface Admission {
    id: number;
    patient_id: number;
    patient_name: string;
    doctor_id: number;
    doctor_name: string;
    status: string;
    room_number: string;
    bed_number: string;
    admitted_at: string;
    total_bill: number;
    severity?: 'NORMAL' | 'CRITICAL' | 'STABLE'; // Mocked for visual effect
}

const WARD_STRUCTURE = {
    'General Ward': { rooms: ['101', '102', '103', '104', '105'], color: 'cyan' },
    'ICU': { rooms: ['201', '202', '203'], color: 'red' },
    'Private Wing': { rooms: ['301', '302', '303', '304'], color: 'emerald' },
};

export default function SentientWardDashboard() {
    const [admissions, setAdmissions] = useState<Admission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'hologram' | 'blueprint'>('hologram');

    const fetchAdmissions = async () => {
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch('/api/reception/active-admissions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Adding mock severity for Sentient UI effect
                const enriched = data.map((a: any) => ({
                    ...a,
                    severity: Math.random() > 0.8 ? 'CRITICAL' : (Math.random() > 0.5 ? 'STABLE' : 'NORMAL')
                }));
                setAdmissions(enriched);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmissions();
        const interval = setInterval(fetchAdmissions, 10000);
        return () => clearInterval(interval);
    }, []);

    const getRoomStatus = (roomNum: string) => {
        const patient = admissions.find(a => a.room_number === roomNum);
        if (!patient) return { status: 'empty', color: 'gray' };
        if (patient.severity === 'CRITICAL') return { status: 'critical', color: 'red', patient };
        if (patient.severity === 'STABLE') return { status: 'stable', color: 'emerald', patient };
        return { status: 'occupied', color: 'cyan', patient };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="w-12 h-12 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" />
                <div className="font-mono text-[10px] tracking-[0.4em] text-accent-cyan uppercase animate-pulse">Scanning_Spatial_Nodes</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-8 pb-20">
            <header className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                    <SplitText text="SENTIENT WARD MATRIX" className="text-3xl font-black text-white tracking-[0.2em]" />
                    <BlurIn delay={0.2}>
                        <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.1em] flex items-center gap-2">
                            <Map className="text-accent-cyan" size={14} /> Node: Spatial_Orchestrator_01 // Status: Mapping_Active
                        </p>
                    </BlurIn>
                </div>

                <div className="flex bg-black/40 border border-white/10 rounded-full p-1">
                    <button 
                        onClick={() => setActiveView('hologram')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-mono transition-all uppercase flex items-center gap-2 ${activeView === 'hologram' ? 'bg-accent-cyan text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Zap size={12} /> Hologram
                    </button>
                    <button 
                        onClick={() => setActiveView('blueprint')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-mono transition-all uppercase flex items-center gap-2 ${activeView === 'blueprint' ? 'bg-accent-cyan text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Layout size={12} /> Blueprint
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8">
                {/* Ward Grid */}
                <div className="col-span-8 space-y-12">
                    {Object.entries(WARD_STRUCTURE).map(([wardName, ward]) => (
                        <div key={wardName} className="space-y-4">
                            <h3 className="text-xs font-mono text-white/40 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Box size={14} className={`text-${ward.color}-400`} /> {wardName}
                            </h3>
                            
                            <div className="grid grid-cols-5 gap-4">
                                {ward.rooms.map((roomNum) => {
                                    const { status, color, patient } = getRoomStatus(roomNum);
                                    const isSelected = selectedRoom === roomNum;

                                    return (
                                        <motion.div
                                            key={roomNum}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setSelectedRoom(isSelected ? null : roomNum)}
                                            className={`
                                                relative h-32 rounded-2xl border transition-all cursor-pointer group overflow-hidden
                                                ${isSelected ? `border-${color}-500 ring-2 ring-${color}-500/20` : 'border-white/5 bg-white/5 hover:border-white/20'}
                                            `}
                                        >
                                            {/* Status Glow */}
                                            {status !== 'empty' && (
                                                <div className={`absolute inset-0 bg-${color}-500/5 ${status === 'critical' ? 'animate-pulse' : ''}`} />
                                            )}
                                            
                                            <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-mono text-white/60">RM_{roomNum}</span>
                                                    {status === 'critical' && <AlertTriangle size={14} className="text-red-500 animate-bounce" />}
                                                </div>
                                                
                                                <div className="flex flex-col">
                                                    {patient ? (
                                                        <>
                                                            <span className="text-[10px] font-bold text-white uppercase truncate">{patient.patient_name}</span>
                                                            <span className={`text-[8px] font-mono uppercase tracking-widest mt-1 text-${color}-400`}>{status}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest italic">Available</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Sentinel Scan Effect */}
                                            <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 group-hover:animate-shimmer" />
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Sentient Observer Panel */}
                <div className="col-span-4 sticky top-8">
                    <AnimatePresence mode="wait">
                        {selectedRoom ? (
                            <motion.div
                                key="detail"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <GlassCard className="!p-8 border-accent-cyan/20">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <p className="text-[10px] font-mono text-accent-cyan uppercase tracking-widest mb-1">Room_Identity</p>
                                            <h2 className="text-3xl font-black text-white italic">RM_{selectedRoom}</h2>
                                        </div>
                                        <button onClick={() => setSelectedRoom(null)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {getRoomStatus(selectedRoom).patient ? (
                                        <div className="space-y-8">
                                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                                                <div className="w-12 h-12 rounded-full bg-accent-cyan/10 flex items-center justify-center border border-accent-cyan/20">
                                                    <User className="text-accent-cyan" size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold uppercase tracking-tight">{getRoomStatus(selectedRoom).patient?.patient_name}</h4>
                                                    <p className="text-[10px] text-gray-500 font-mono">Patient_ID: #00{getRoomStatus(selectedRoom).patient?.patient_id}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                                                    <p className="text-[9px] font-mono text-gray-500 uppercase mb-1 tracking-widest">Physician</p>
                                                    <p className="text-xs text-white font-bold truncate">Dr. {getRoomStatus(selectedRoom).patient?.doctor_name}</p>
                                                </div>
                                                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                                                    <p className="text-[9px] font-mono text-gray-500 uppercase mb-1 tracking-widest">Current_Bill</p>
                                                    <p className="text-xs text-emerald-400 font-bold italic">₹{getRoomStatus(selectedRoom).patient?.total_bill.toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h5 className="text-[10px] font-mono text-white/40 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                                                    <Activity size={12} className="text-accent-cyan" /> SENTIENT_ALLOCATION_LOG
                                                </h5>
                                                <div className="space-y-3">
                                                    <div className="flex gap-3 text-[10px] font-mono">
                                                        <span className="text-white/20">08:42</span>
                                                        <span className="text-emerald-400">SYNC</span>
                                                        <span className="text-white/60">Vitals aligned with room sensors.</span>
                                                    </div>
                                                    <div className="flex gap-3 text-[10px] font-mono">
                                                        <span className="text-white/20">06:15</span>
                                                        <span className="text-purple-400">NOTE</span>
                                                        <span className="text-white/60">Morning round completed by Dr. {getRoomStatus(selectedRoom).patient?.doctor_name}.</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <GlassButton className="w-full gap-2 py-6 text-xs italic group">
                                                REQUEST_TRANSFER <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </GlassButton>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="p-8 rounded-3xl border border-dashed border-white/10 text-center space-y-4 bg-white/5">
                                                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                                                    <CheckCircle className="text-emerald-400" size={32} />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-white font-bold uppercase tracking-widest">Room_Vacant</p>
                                                    <p className="text-[10px] text-gray-500 font-mono italic mt-1 uppercase">Ready for immediate allocation</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h5 className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                                                    <Zap size={12} className="text-amber-400" /> PROACTIVE_SUGGESTION
                                                </h5>
                                                <div className="p-4 rounded-2xl bg-amber-400/5 border border-amber-400/20">
                                                    <p className="text-[10px] text-amber-400/80 font-mono leading-relaxed italic">
                                                        AI suggests reserving this room for upcoming high-risk cardiac admission (Patient #482) based on proximity to ICU elevator.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </GlassCard>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="placeholder"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <GlassCard className="h-[60vh] flex flex-col items-center justify-center text-center p-8 border-dashed border-white/5">
                                    <div className="relative mb-8">
                                        <div className="w-32 h-32 rounded-full border border-accent-cyan/20 animate-ping absolute inset-0" />
                                        <div className="w-32 h-32 rounded-full border border-accent-cyan/10 animate-pulse absolute inset-0" />
                                        <div className="w-32 h-32 rounded-full bg-accent-cyan/5 border border-white/10 flex items-center justify-center relative z-10">
                                            <Map size={48} className="text-accent-cyan/40" />
                                        </div>
                                    </div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 italic">Select_Room_to_Sync</h3>
                                    <p className="text-[10px] text-gray-500 font-mono max-w-[200px] leading-relaxed">
                                        Spatial sensors active. Waiting for room selection to bridge telemetry data.
                                    </p>
                                </GlassCard>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

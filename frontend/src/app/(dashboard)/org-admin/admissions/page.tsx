'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { 
    Building2, Users, Plus, Search, Activity, CheckCircle, 
    X, DollarSign, Map
} from 'lucide-react';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';
import { useFetchAdmissions } from '@/hooks/useFetchAdmissions';
import { AdmissionModal } from '@/components/dashboard/AdmissionModal';
import { BillingItemModal } from '@/components/dashboard/BillingItemModal';

export default function UnifiedAdmissionsDashboard() {
    const { admissions, loading, fetchAdmissions } = useFetchAdmissions();
    const [activeTab, setActiveTab] = useState<'overview' | 'ward' | 'billing'>('overview');
    const [showAdmitModal, setShowAdmitModal] = useState(false);
    const [selectedAdmissionId, setSelectedAdmissionId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleDischarge = async (admissionId: number) => {
        if (!confirm('Are you sure you want to discharge this patient?')) return;
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`/api/reception/discharge/${admissionId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchAdmissions();
        } catch (err) {
            console.error('Discharge error:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="w-12 h-12 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" />
                <div className="font-mono text-[10px] tracking-[0.4em] text-accent-cyan uppercase animate-pulse">Syncing_Operations_Matrix</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-8 pb-20">
            <header className="flex flex-col gap-2">
                <SplitText text="HOSPITAL COMMAND CENTER" className="text-3xl font-black text-white tracking-[0.2em]" />
                <BlurIn delay={0.2}>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.1em] flex items-center gap-2">
                        <Building2 className="text-accent-cyan" size={14} /> Node: Unified_Ops_01 // Status: Nominal
                    </p>
                </BlurIn>
            </header>

            <div className="flex justify-between items-center">
                <div className="flex bg-black/40 border border-white/10 rounded-full p-1">
                    {['overview', 'ward', 'billing'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-mono transition-all uppercase ${activeTab === tab ? 'bg-accent-cyan text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                
                <div className="flex gap-3">
                    <GlassButton onClick={() => window.location.href = '/org-admin/ward'} className="gap-2 text-[10px]">
                        <Map size={14} /> WARD_VIEW
                    </GlassButton>
                    <GlassButton onClick={() => setShowAdmitModal(true)} className="gap-2 text-[10px] !bg-accent-cyan !text-black">
                        <Plus size={14} /> NEW_ADMISSION
                    </GlassButton>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-12 gap-6">
                    {/* Stats */}
                    <div className="col-span-12 grid grid-cols-4 gap-4">
                        {[
                            { label: 'Occupancy', val: admissions.length, icon: Activity, color: 'text-accent-cyan' },
                            { label: 'Active Bills', val: `₹${admissions.reduce((acc, a) => acc + a.total_bill, 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
                            { label: 'Critical', val: admissions.filter(a => a.severity === 'CRITICAL').length, icon: Users, color: 'text-red-400' },
                            { label: 'System Health', val: '100%', icon: CheckCircle, color: 'text-purple-400' }
                        ].map((stat, i) => (
                            <GlassCard key={i} className="p-6">
                                <stat.icon className={`${stat.color} mb-2`} size={20} />
                                <span className="text-2xl font-bold text-white block">{stat.val}</span>
                                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">{stat.label}</span>
                            </GlassCard>
                        ))}
                    </div>

                    {/* Patient Matrix */}
                    <div className="col-span-12">
                        <GlassCard>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <Users className="text-accent-cyan" size={18} /> PATIENT_OPERATIONS_MATRIX
                                </h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                                    <input 
                                        type="text" 
                                        placeholder="Scan Patient Name..." 
                                        className="bg-black/40 border border-white/5 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-accent-cyan/30 w-64"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                {admissions.filter(a => a.patient_name.toLowerCase().includes(searchQuery.toLowerCase())).map((adm) => (
                                    <div key={adm.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-accent-cyan/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-1.5 h-1.5 rounded-full ${adm.severity === 'CRITICAL' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                            <div>
                                                <h4 className="text-white font-bold text-sm uppercase">{adm.patient_name}</h4>
                                                <p className="text-[10px] text-gray-500 font-mono">RM_{adm.room_number} // Bed_{adm.bed_number} // Dr. {adm.doctor_name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-emerald-400">₹{adm.total_bill.toLocaleString()}</p>
                                                <p className="text-[9px] text-gray-500 font-mono uppercase">Current_Bill</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setSelectedAdmissionId(adm.id)}
                                                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-accent-cyan transition-all"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDischarge(adm.id)}
                                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono uppercase hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    Discharge
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Modals */}
            {showAdmitModal && (
                <AdmissionModal 
                    onClose={() => setShowAdmitModal(false)} 
                    onSuccess={() => { setShowAdmitModal(false); fetchAdmissions(); }} 
                />
            )}
            {selectedAdmissionId && (
                <BillingItemModal 
                    admissionId={selectedAdmissionId} 
                    onClose={() => setSelectedAdmissionId(null)} 
                    onSuccess={() => { setSelectedAdmissionId(null); fetchAdmissions(); }} 
                />
            )}
        </div>
    );
}

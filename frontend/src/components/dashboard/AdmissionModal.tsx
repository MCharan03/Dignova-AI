import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';

interface AdmissionModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const AdmissionModal: React.FC<AdmissionModalProps> = ({ onClose, onSuccess }) => {
    const [lookupQuery, setLookupQuery] = useState('');
    const [foundPatient, setPatient] = useState<any>(null);
    const [isNewPatient, setIsNewPatient] = useState(false);
    const [newAdmit, setNewAdmit] = useState({ doctor_id: '', room_number: '', bed_number: '', base_charge: '500' });
    const [registerForm, setRegisterForm] = useState({ name: '', phone_number: '', email: '', blood_group: '' });

    const handleLookup = async () => {
        if (!lookupQuery) return;
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`/api/reception/lookup-patient?query=${lookupQuery}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data && data.id) {
                setPatient(data);
                setIsNewPatient(false);
                setNewAdmit(prev => ({ ...prev, base_charge: '500' }));
            } else {
                setPatient(null);
                setIsNewPatient(true);
                setRegisterForm({ ...registerForm, phone_number: lookupQuery });
                setNewAdmit(prev => ({ ...prev, base_charge: '1200' }));
            }
        } catch (err) {
            console.error('Lookup error:', err);
            setPatient(null);
            setIsNewPatient(true);
            setNewAdmit(prev => ({ ...prev, base_charge: '1200' }));
        }
    };

    const handleQuickRegisterAndAdmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('access_token');
        try {
            let patientId = foundPatient?.id;
            
            if (isNewPatient) {
                const regRes = await fetch('/api/reception/quick-register', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(registerForm)
                });
                if (regRes.ok) {
                    const regData = await regRes.json();
                    patientId = regData.id;
                } else {
                    const err = await regRes.json();
                    alert(err.detail || 'Registration failed');
                    return;
                }
            }

            const res = await fetch('/api/reception/admit', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    doctor_id: parseInt(newAdmit.doctor_id),
                    room_number: newAdmit.room_number,
                    bed_number: newAdmit.bed_number
                })
            });
            
            if (res.ok) {
                const admData = await res.json();
                await fetch(`/api/reception/billing/${admData.id}/item`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        category: 'consultation',
                        description: isNewPatient ? 'NON-USER ADMISSION PREMIUM' : 'DIGNOVA USER ADMISSION',
                        amount: parseFloat(newAdmit.base_charge),
                        quantity: 1
                    })
                });
                onSuccess();
            } else {
                const err = await res.json();
                alert(err.detail || 'Admission failed');
            }
        } catch (err) {
            console.error('Process error:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg">
                <GlassCard className="!p-8 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={20} /></button>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Patient Admission</h3>
                    
                    <div className="space-y-6">
                        {!foundPatient && !isNewPatient ? (
                            <div className="space-y-4">
                                <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Identify Subject</p>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={lookupQuery} 
                                        onChange={e => setLookupQuery(e.target.value)}
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 focus:outline-none" 
                                        placeholder="Enter Phone or Email" 
                                    />
                                    <button onClick={handleLookup} className="px-6 rounded-xl bg-accent-cyan text-black font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all">Search</button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleQuickRegisterAndAdmit} className="space-y-4">
                                {foundPatient ? (
                                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-mono text-emerald-400 uppercase mb-1 tracking-widest flex items-center gap-1">
                                                <CheckCircle size={10} /> DIGNOVA_USER_FOUND
                                            </p>
                                            <h4 className="text-white font-bold">{foundPatient.name}</h4>
                                            <p className="text-[10px] text-gray-500 font-mono">{foundPatient.phone_number}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-mono text-gray-500 uppercase">Base_Charge</p>
                                            <p className="text-sm font-black text-emerald-400">₹{newAdmit.base_charge}</p>
                                            <button type="button" onClick={() => { setPatient(null); setLookupQuery(''); }} className="text-[9px] font-mono text-white/20 hover:text-white underline block mt-1">Change</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-mono text-red-400 uppercase mb-1 tracking-widest flex items-center gap-1">
                                                    <X size={10} /> SUBJECT_NOT_FOUND
                                                </p>
                                                <p className="text-[10px] text-gray-500 font-mono">Premium Rates Apply</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-mono text-gray-500 uppercase">Base_Charge</p>
                                                <p className="text-sm font-black text-red-400">₹{newAdmit.base_charge}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input required value={registerForm.name} onChange={e => setRegisterForm({...registerForm, name: e.target.value})} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 focus:outline-none" placeholder="Full Name" />
                                            <input required value={registerForm.phone_number} readOnly className="bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-gray-500 text-sm focus:outline-none" placeholder="Phone" />
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <input required type="number" value={newAdmit.doctor_id} onChange={e => setNewAdmit({...newAdmit, doctor_id: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 focus:outline-none" placeholder="Primary Doctor ID" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" value={newAdmit.room_number} onChange={e => setNewAdmit({...newAdmit, room_number: e.target.value})} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 focus:outline-none" placeholder="Room #" />
                                        <input type="text" value={newAdmit.bed_number} onChange={e => setNewAdmit({...newAdmit, bed_number: e.target.value})} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 focus:outline-none" placeholder="Bed #" />
                                    </div>
                                    <GlassButton type="submit" className="w-full mt-4">Confirm Admission</GlassButton>
                                </div>
                            </form>
                        )}
                    </div>
                </GlassCard>
            </motion.div>
        </div>
    );
};

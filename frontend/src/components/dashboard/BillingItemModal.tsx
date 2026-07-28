import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { apiUrl } from '@/lib/api';

interface BillingItemModalProps {
    admissionId: number;
    onClose: () => void;
    onSuccess: () => void;
}

export const BillingItemModal: React.FC<BillingItemModalProps> = ({ admissionId, onClose, onSuccess }) => {
    const [billingItem, setBillingItem] = useState({ 
        category: 'room', 
        description: '', 
        amount: '', 
        quantity: '1' 
    });

    const handleAddBilling = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(apiUrl(`/api/reception/billing/${admissionId}/item`), {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: billingItem.category,
                    description: billingItem.description,
                    amount: parseFloat(billingItem.amount),
                    quantity: parseInt(billingItem.quantity)
                })
            });
            if (res.ok) {
                onSuccess();
            }
        } catch (err) {
            console.error('Billing error:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
                <GlassCard className="!p-8 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={20} /></button>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Add Billing Item</h3>
                    <form onSubmit={handleAddBilling} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-mono text-white/40 uppercase mb-1 block">Category</label>
                            <select value={billingItem.category} onChange={e => setBillingItem({...billingItem, category: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 focus:outline-none">
                                <option value="room">Room Charge</option>
                                <option value="medication">Medication</option>
                                <option value="procedure">Procedure</option>
                                <option value="consultation">Consultation</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-mono text-white/40 uppercase mb-1 block">Description</label>
                            <input required type="text" value={billingItem.description} onChange={e => setBillingItem({...billingItem, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 focus:outline-none" placeholder="e.g. ICU Stay (24h)" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-mono text-white/40 uppercase mb-1 block">Amount (₹)</label>
                                <input required type="number" value={billingItem.amount} onChange={e => setBillingItem({...billingItem, amount: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 focus:outline-none" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="text-[10px] font-mono text-white/40 uppercase mb-1 block">Quantity</label>
                                <input required type="number" value={billingItem.quantity} onChange={e => setBillingItem({...billingItem, quantity: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-accent-cyan/50 focus:outline-none" placeholder="1" />
                            </div>
                        </div>
                        <GlassButton type="submit" className="w-full mt-4">Add to Bill</GlassButton>
                    </form>
                </GlassCard>
            </motion.div>
        </div>
    );
};

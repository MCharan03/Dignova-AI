'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { Calendar, Clock, User, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react';

interface Doctor {
    id: number;
    name: string;
    specialty: string | null;
    is_online: boolean;
    consultation_fee: number | null;
}

interface DoctorBookingProps {
    doctors: Doctor[];
    onBooked?: () => void;
}

export function DoctorBooking({ doctors, onBooked }: DoctorBookingProps) {
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [booking, setBooking] = useState(false);
    const [success, setSuccess] = useState(false);

    const timeSlots = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
        "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
    ];

    const handleBook = async () => {
        if (!selectedDoctor || !selectedTime) return;
        
        setBooking(true);
        const token = localStorage.getItem('access_token');
        const slot_time = `${selectedDate}T${selectedTime}:00`;

        try {
            const res = await fetch('/api/appointments/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    doctor_id: selectedDoctor.id,
                    slot_time: slot_time
                })
            });

            if (res.ok) {
                setSuccess(true);
                if (onBooked) onBooked();
            }
        } catch (err) {
            console.error('Booking failed:', err);
        } finally {
            setBooking(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent-cyan/20 flex items-center justify-center mb-2">
                    <CheckCircle className="text-accent-cyan" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">Appointment_Confirmed</h3>
                <p className="text-gray-400 text-sm max-w-xs">Your consultation has been scheduled and synced with the medical grid.</p>
                <GlassButton onClick={() => setSuccess(false)}>Book Another</GlassButton>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {!selectedDoctor ? (
                <div className="space-y-4">
                    <h3 className="text-sm font-mono text-gray-500 uppercase tracking-[0.2em] mb-4">Select_Available_Specialist</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {doctors.filter(d => d.is_online).map((doc) => (
                            <div 
                                key={doc.id}
                                onClick={() => setSelectedDoctor(doc)}
                                className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-accent-cyan/30 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center border border-accent-blue/30">
                                        <User className="text-accent-blue" size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-sm group-hover:text-accent-cyan transition-colors">{doc.name}</h4>
                                        <p className="text-[10px] text-gray-500 uppercase font-mono">{doc.specialty || 'General Practitioner'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-accent-cyan font-mono">${doc.consultation_fee || 50}</p>
                                    <ChevronRight size={16} className="text-gray-600 inline ml-2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <div className="flex items-center justify-between">
                        <button 
                            onClick={() => setSelectedDoctor(null)}
                            className="text-[10px] font-mono text-accent-cyan uppercase hover:underline"
                        >
                            ← Back_to_List
                        </button>
                        <div className="text-right">
                            <h4 className="text-white font-bold">{selectedDoctor.name}</h4>
                            <p className="text-[10px] text-gray-500 uppercase font-mono">{selectedDoctor.specialty}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-mono text-gray-500 uppercase">Select_Date</label>
                        <input 
                            type="date" 
                            min={new Date().toISOString().split('T')[0]}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white font-mono focus:border-accent-cyan/50 outline-none"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-mono text-gray-500 uppercase">Select_Time_Slot</label>
                        <div className="grid grid-cols-3 gap-2">
                            {timeSlots.map(time => (
                                <button
                                    key={time}
                                    onClick={() => setSelectedTime(time)}
                                    className={`py-2 rounded-lg text-xs font-mono transition-all border ${
                                        selectedTime === time 
                                        ? 'bg-accent-cyan/20 border-accent-cyan text-white' 
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <GlassButton 
                            className="w-full" 
                            disabled={!selectedTime || booking}
                            onClick={handleBook}
                        >
                            {booking ? 'SECURE_RESERVATION...' : 'CONFIRM_APPOINTMENT'}
                        </GlassButton>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

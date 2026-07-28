'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Calendar, Clock, User, Check, X, ChevronLeft, ChevronRight, Stethoscope, Star } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface Doctor { id: number; name: string; specialty: string; qualification: string; department: string; experience_years: number; consultation_fee: number; is_online: boolean; bio: string; available_days: { day: number; start: string; end: string }[]; }
interface TimeSlot { hour: number; label: string; available: boolean; }

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function generateSlots(start: string, end: string): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh] = end.split(':').map(Number);
    for (let h = sh; h < eh; h++) {
        slots.push({ hour: h, label: `${h.toString().padStart(2, '0')}:00`, available: true });
        if (h + 0.5 < eh) slots.push({ hour: h + 0.5, label: `${h.toString().padStart(2, '0')}:30`, available: true });
    }
    return slots;
}

export function AppointmentBooking({ doctors, onBooked }: { doctors?: Doctor[]; onBooked?: () => void }) {
    const [allDoctors, setAllDoctors] = useState<Doctor[]>(doctors || []);
    const [selectedDoc, setSelectedDoc] = useState<Doctor | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [booking, setBooking] = useState(false);
    const [booked, setBooked] = useState(false);
    const [weekOffset, setWeekOffset] = useState(0);

    const token = () => localStorage.getItem('access_token') || '';

    useEffect(() => {
        if (!doctors || doctors.length === 0) {
            fetch(apiUrl('/api/appointments/doctors'), { headers: { Authorization: `Bearer ${token()}` } })
                .then(r => r.ok ? r.json().catch(() => ({})) : []).then(setAllDoctors);
        }
    }, [doctors]);

    // Build week grid
    const weekDays: Date[] = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + weekOffset * 7 - today.getDay() + 1);
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        weekDays.push(d);
    }

    const availableSlots: TimeSlot[] = (() => {
        if (!selectedDate || !selectedDoc) return [];
        const dow = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1;
        const sched = (selectedDoc.available_days || []).find(d => d.day === dow);
        if (!sched) return [];
        return generateSlots(sched.start, sched.end);
    })();

    const isDayAvailable = (date: Date) => {
        if (!selectedDoc) return false;
        const dow = date.getDay() === 0 ? 6 : date.getDay() - 1;
        return (selectedDoc.available_days || []).some(d => d.day === dow);
    };

    const handleBook = async () => {
        if (!selectedDoc || !selectedDate || !selectedSlot) return;
        setBooking(true);
        const slotTime = new Date(selectedDate);
        const [h, m] = selectedSlot.split(':').map(Number);
        slotTime.setHours(h, m, 0, 0);
        try {
            const res = await fetch(apiUrl('/api/appointments/book'), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ doctor_id: selectedDoc.id, slot_time: slotTime.toISOString(), notes })
            });
            if (res.ok) { setBooked(true); onBooked?.(); }
        } finally { setBooking(false); }
    };

    if (booked) return (
        <div className="p-12 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-6">
                <Check size={36} className="text-emerald-400" />
            </motion.div>
            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Appointment Requested!</h3>
            <p className="text-sm text-white/50">Dr. {selectedDoc?.name} will confirm shortly. You&apos;ll receive a notification.</p>
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><Calendar size={16} className="text-accent-cyan" /> Book Appointment</h3>

            {/* Step 1: Select Doctor */}
            {!selectedDoc ? (
                <div className="space-y-3">
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Select a Doctor</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                        {allDoctors.map(doc => (
                            <button key={doc.id} onClick={() => setSelectedDoc(doc)}
                                className="p-4 rounded-2xl bg-black/30 border border-white/5 hover:border-accent-cyan/30 text-left transition-all group">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-bold text-white group-hover:text-accent-cyan transition-colors">{doc.name}</p>
                                        <p className="text-xs text-white/40">{doc.specialty} · {doc.experience_years}y exp</p>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full mt-1 ${doc.is_online ? 'bg-emerald-400' : 'bg-white/20'}`} />
                                </div>
                                {doc.consultation_fee && <p className="text-[10px] font-mono text-accent-cyan">₹{doc.consultation_fee} / session</p>}
                                <p className="text-[10px] text-white/30 mt-1">{(doc.available_days?.length || 0)} days available</p>
                            </button>
                        ))}
                    </div>
                </div>
            ) : !selectedDate ? (
                /* Step 2: Select Date */
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedDoc(null)} className="text-white/40 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Dr. {selectedDoc.name} — Select Date</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setWeekOffset(o => o - 1)} disabled={weekOffset <= 0} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all"><ChevronLeft size={14} /></button>
                            <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                            const d = weekDays[i];
                            const dStr = d.toDateString();
                            const avail = isDayAvailable(d);
                            const isPast = d.getTime() < today.getTime() && dStr !== today.toDateString();
                            return (
                                <button key={i} onClick={() => !isPast && avail && setSelectedDate(d)} disabled={!avail || isPast}
                                    className={`flex flex-col items-center p-3 rounded-2xl transition-all ${avail && !isPast ? 'hover:border-accent-cyan/40 cursor-pointer' : 'opacity-30 cursor-not-allowed'} bg-black/30 border border-white/5`}>
                                    <span className="text-[9px] font-mono text-white/40 uppercase">{DAY_NAMES[i]}</span>
                                    <span className={`text-lg font-black ${avail && !isPast ? 'text-white' : 'text-white/30'}`}>{d.getDate()}</span>
                                    {avail && !isPast && <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : !selectedSlot ? (
                /* Step 3: Select Time */
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedDate(null)} className="text-white/40 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                        <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {availableSlots.map(slot => (
                            <button key={slot.label} onClick={() => setSelectedSlot(slot.label)}
                                className={`p-3 rounded-xl text-sm font-mono transition-all border ${selectedSlot === slot.label ? 'bg-accent-cyan text-black border-accent-cyan font-black' : 'bg-black/30 border-white/5 text-white/60 hover:border-accent-cyan/30 hover:text-white'}`}>
                                {slot.label}
                            </button>
                        ))}
                        {availableSlots.length === 0 && <p className="col-span-full text-center text-white/40 text-sm py-8">No slots available for this day</p>}
                    </div>
                </div>
            ) : (
                /* Step 4: Confirm */
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedSlot(null)} className="text-white/40 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                        <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Confirm Appointment</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-accent-cyan/5 border border-accent-cyan/20 space-y-3">
                        <div className="flex justify-between"><span className="text-xs text-white/40">Doctor</span><span className="text-sm font-bold text-white">Dr. {selectedDoc.name}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-white/40">Date</span><span className="text-sm text-white">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
                        <div className="flex justify-between"><span className="text-xs text-white/40">Time</span><span className="text-sm text-accent-cyan font-bold">{selectedSlot}</span></div>
                        {selectedDoc.consultation_fee && <div className="flex justify-between"><span className="text-xs text-white/40">Fee</span><span className="text-sm text-white">₹{selectedDoc.consultation_fee}</span></div>}
                    </div>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent-cyan/50 placeholder:text-white/20 resize-none h-20" placeholder="Optional notes for the doctor..." />
                    <GlassButton onClick={handleBook} disabled={booking} className="w-full gap-2 justify-center">
                        {booking ? 'Booking...' : <><Check size={16} /> Confirm Appointment</>}
                    </GlassButton>
                </div>
            )}
        </div>
    );
}

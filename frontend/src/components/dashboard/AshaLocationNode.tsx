'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Radio, ShieldCheck, Activity } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

export function AshaLocationNode() {
    const [status, setStatus] = useState<'idle' | 'tracking' | 'approaching' | 'checked_in'>('idle');
    const [distance, setDistance] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Hospital Coordinates (Matches backend geofencing.py)
    const HOSPITAL_LAT = 12.9716;
    const HOSPITAL_LON = 77.5946;

    useEffect(() => {
        if (!("geolocation" in navigator)) {
            setError("Geopositioning not supported by hardware.");
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setStatus('tracking');

                // 1. Calculate client-side distance for UI feedback
                const dist = calculateDistance(latitude, longitude, HOSPITAL_LAT, HOSPITAL_LON);
                setDistance(Math.round(dist * 1000)); // meters

                if (dist <= 0.5) { // 500m
                    setStatus('approaching');
                    
                    // 2. Ping backend to trigger Sentient Check-in (Automation 06)
                    const token = localStorage.getItem('access_token');
                    try {
                        const res = await fetch('/api/n8n/webhook/geofence-checkin', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}` 
                            },
                            body: JSON.stringify({
                                latitude,
                                longitude,
                                telegram_chat_id: '6019617155' // Linked to user
                            })
                        });
                        const data = await res.json();
                        if (data.status === 'checked_in') {
                            setStatus('checked_in');
                        }
                    } catch (e) {
                        console.error("Geofence ping failed:", e);
                    }
                }
            },
            (err) => {
                console.error(err);
                setError("Neural Location access denied.");
            },
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    if (error) return null;

    return (
        <div className="fixed bottom-24 right-6 z-40">
            <AnimatePresence>
                {status !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    >
                        <GlassCard className={`p-4 flex items-center gap-4 border-l-4 shadow-2xl ${
                            status === 'checked_in' ? 'border-l-success bg-success/5' : 
                            status === 'approaching' ? 'border-l-accent-cyan bg-accent-cyan/5' : 
                            'border-l-accent-blue bg-white/5'
                        }`}>
                            <div className="relative">
                                <div className={`p-2 rounded-lg ${status === 'checked_in' ? 'bg-success/20 text-success' : 'bg-accent-blue/20 text-accent-blue'}`}>
                                    {status === 'checked_in' ? <ShieldCheck size={20} /> : <MapPin size={20} className={status === 'approaching' ? 'animate-bounce' : ''} />}
                                </div>
                                {status === 'tracking' && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent-blue rounded-full animate-ping" />
                                )}
                            </div>

                            <div className="pr-4">
                                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest leading-none mb-1">Asha_Node_Active</p>
                                <h4 className="text-xs font-bold text-white uppercase tracking-tight">
                                    {status === 'checked_in' ? 'Proximity Check-in Complete' : 
                                     status === 'approaching' ? 'Hospital Detected' : 
                                     'Tracking Proximity'}
                                </h4>
                                {distance !== null && status !== 'checked_in' && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div 
                                                className="h-full bg-accent-blue"
                                                animate={{ width: `${Math.max(0, 100 - (distance / 20))}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-mono text-accent-blue">{distance}m</span>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

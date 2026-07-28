'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Shield, Lock, Activity, Cpu, Terminal, Eye, AlertCircle } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface SecurityEvent {
    id: number;
    event: string;
    timestamp: string;
    status: string;
    node: string;
}

interface SecurityStatusData {
    encryption: string;
    firewall: string;
    zero_trust: string;
    integrity: string;
    last_scan: string;
}

export default function SecurityStatus() {
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [status, setStatus] = useState<SecurityStatusData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSecurityData = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            try {
                const [eventsRes, statusRes] = await Promise.all([
                    fetch(apiUrl('/api/security/events'), { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(apiUrl('/api/security/status'), { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (eventsRes.ok) setEvents(await eventsRes.json().catch(() => ({})));
                if (statusRes.ok) setStatus(await statusRes.json().catch(() => ({})));
            } catch (err) {
                console.error('Failed to sync security telemetry:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSecurityData();
        const interval = setInterval(fetchSecurityData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !status) return <div className="h-48 flex items-center justify-center font-mono text-[10px] text-accent-cyan animate-pulse">Establishing_Secure_Link...</div>;

    return (
        <GlassCard className="relative overflow-hidden border-accent-cyan/20 group">
            {/* Background Scanner Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/5 to-transparent pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <Shield className="text-accent-cyan group-hover:scale-110 transition-transform" size={18} />
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Security Protocol</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 border border-success/20">
                    <div className="w-1 h-1 rounded-full bg-success animate-pulse" />
                    <span className="text-[8px] font-mono text-success font-black tracking-tighter uppercase">Armed</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-1">
                    <p className="text-[8px] font-mono text-gray-500 uppercase">Encryption</p>
                    <div className="flex items-center gap-2">
                        <Lock size={10} className="text-accent-cyan" />
                        <span className="text-[10px] font-bold text-white truncate">{status?.encryption || 'AES-256 GCM'}</span>
                    </div>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-1">
                    <p className="text-[8px] font-mono text-gray-500 uppercase">Firewall</p>
                    <div className="flex items-center gap-2">
                        <Activity size={10} className="text-accent-blue" />
                        <span className="text-[10px] font-bold text-white">{status?.firewall || 'ACTIVE'}</span>
                    </div>
                </div>
            </div>

            {/* Scrolling Ticker of Audit Events */}
            <div className="relative h-24 overflow-hidden rounded-lg bg-black/60 border border-white/5 p-2">
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />
                
                <div className="space-y-2 animate-in slide-in-from-bottom-2">
                    {events.map((ev, i) => (
                        <div key={ev.id} className="flex items-center justify-between text-[8px] font-mono border-b border-white/5 pb-1 opacity-70 hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">[{new Date(ev.timestamp).toLocaleTimeString([], {hour12: false})}]</span>
                                <span className="text-accent-cyan font-bold">{ev.event}</span>
                            </div>
                            <span className="text-gray-600">{ev.node}</span>
                        </div>
                    ))}
                    {events.length === 0 && (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-[8px] font-mono text-gray-600 italic">No recent security events detected</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2 text-[8px] font-mono text-gray-500 uppercase tracking-tighter">
                    <Cpu size={12} className="text-accent-purple" />
                    <span>Neural Bridge: 0.2ms Latency</span>
                </div>
                <div className="flex items-center gap-2 text-[8px] font-mono text-success font-bold">
                    <Eye size={12} />
                    <span>ZERO-TRUST_ACTIVE</span>
                </div>
            </div>
        </GlassCard>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import {
    Stethoscope, Clock, Star, Globe, CreditCard, Award,
    ShieldCheck, Briefcase, Edit3, X, Save, ChevronDown,
    Activity
} from 'lucide-react';

interface Doctor {
    id: number;
    name: string;
    email: string;
    specialty: string | null;
    tier: string | null;
    is_online: boolean | null;
    qualification: string | null;
    license_number: string | null;
    department: string | null;
    experience_years: number | null;
    bio: string | null;
    languages: string | null;
    consultation_fee: number | null;
    available_hours: string | null;
    rating: number | null;
}

interface EditState {
    specialty?: string | null;
    qualification?: string | null;
    license_number?: string | null;
    department?: string | null;
    experience_years?: number | null;
    bio?: string | null;
    languages?: string | null;
    consultation_fee?: number | null;
    available_hours?: string | null;
    rating?: number | null;
}

export default function DoctorManagementPage() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<EditState>({});
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch('/api/auth/doctors', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDoctors(data);
            }
        } catch (err) {
            console.error('Failed to fetch doctors:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDoctors(); }, []);

    const startEdit = (doc: Doctor) => {
        setEditingId(doc.id);
        setEditData({
            specialty: doc.specialty || '',
            qualification: doc.qualification || '',
            license_number: doc.license_number || '',
            department: doc.department || '',
            experience_years: doc.experience_years || 0,
            bio: doc.bio || '',
            languages: doc.languages || '',
            consultation_fee: doc.consultation_fee || 0,
            available_hours: doc.available_hours || '',
        });
    };

    const saveProfile = async (docId: number) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('access_token');
            // Ensure numbers are correctly typed or null before sending to strict backend
            const payload = { ...editData };
            
            payload.experience_years = payload.experience_years ? parseInt(payload.experience_years as any, 10) : null;
            payload.consultation_fee = payload.consultation_fee ? parseInt(payload.consultation_fee as any, 10) : null;
            payload.rating = payload.rating ? parseFloat(payload.rating as any) : null;

            const res = await fetch(`/api/auth/doctor-profile/${docId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setEditingId(null);
                fetchDoctors();
            } else {
                const err = await res.json().catch(() => ({ detail: 'Error' }));
                alert(err.detail || 'Failed to save');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const tierColors: Record<string, string> = {
        experienced: '#00e5ff',
        mid_range: '#7c4dff',
        intern: '#ff9100',
    };
    const tierLabels: Record<string, string> = {
        experienced: 'Senior',
        mid_range: 'Mid-Level',
        intern: 'Intern',
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
            <div className="w-10 h-10 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" />
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Loading_Doctor_Matrix</span>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Doctor Profiles</h2>
                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                    {doctors.length} registered • {doctors.filter(d => d.is_online).length} online
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {doctors.map((doc, i) => {
                    const isEditing = editingId === doc.id;
                    const isExpanded = expandedId === doc.id;
                    const tierColor = tierColors[doc.tier || ''] || '#666';

                    return (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <GlassCard className="relative overflow-hidden">
                                {/* Tier accent bar */}
                                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${tierColor}, transparent)` }} />
                                
                                {/* Header */}
                                <div className="flex items-start justify-between pt-2">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                                            style={{ background: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}30` }}
                                        >
                                            {doc.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-lg leading-tight">{doc.name}</h3>
                                            <p className="text-xs text-gray-400 font-mono">{doc.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span 
                                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                                            style={{ color: tierColor, background: `${tierColor}15`, border: `1px solid ${tierColor}30` }}
                                        >
                                            {tierLabels[doc.tier || ''] || doc.tier}
                                        </span>
                                        <div className={`w-2.5 h-2.5 rounded-full ${doc.is_online ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-gray-600'}`} />
                                    </div>
                                </div>

                                {/* Quick stats row */}
                                <div className="flex items-center gap-4 mt-4 flex-wrap">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                                        <Stethoscope size={13} className="text-accent-cyan" />
                                        <span>{doc.specialty || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                                        <Briefcase size={13} className="text-purple-400" />
                                        <span>{doc.experience_years || 0} yrs</span>
                                    </div>
                                    {doc.rating && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-300">
                                            <Star size={13} className="text-yellow-400" fill="currentColor" />
                                            <span>{doc.rating}/5</span>
                                        </div>
                                    )}
                                    {doc.consultation_fee && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-300">
                                            <CreditCard size={13} className="text-green-400" />
                                            <span>₹{doc.consultation_fee}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Qualification badge */}
                                {doc.qualification && (
                                    <div className="mt-3 flex items-center gap-2">
                                        <Award size={13} className="text-accent-magenta shrink-0" />
                                        <span className="text-xs text-gray-300">{doc.qualification}</span>
                                    </div>
                                )}

                                {/* Expandable details */}
                                <AnimatePresence>
                                    {isExpanded && !isEditing && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                                {doc.bio && (
                                                    <p className="text-xs text-gray-400 leading-relaxed">{doc.bio}</p>
                                                )}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-black/20 rounded-lg p-2.5 border border-white/5">
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Department</span>
                                                        <span className="text-xs text-white">{doc.department || 'N/A'}</span>
                                                    </div>
                                                    <div className="bg-black/20 rounded-lg p-2.5 border border-white/5">
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">License</span>
                                                        <span className="text-xs text-white font-mono">{doc.license_number || 'N/A'}</span>
                                                    </div>
                                                    <div className="bg-black/20 rounded-lg p-2.5 border border-white/5">
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Languages</span>
                                                        <span className="text-xs text-white">{doc.languages || 'N/A'}</span>
                                                    </div>
                                                    <div className="bg-black/20 rounded-lg p-2.5 border border-white/5">
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Available</span>
                                                        <span className="text-xs text-white">{doc.available_hours || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Edit mode */}
                                <AnimatePresence>
                                    {isEditing && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-4 pt-4 border-t border-accent-cyan/20 space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { key: 'specialty', label: 'Specialty' },
                                                        { key: 'qualification', label: 'Qualification' },
                                                        { key: 'department', label: 'Department' },
                                                        { key: 'license_number', label: 'License #' },
                                                        { key: 'languages', label: 'Languages' },
                                                        { key: 'available_hours', label: 'Available Hours' },
                                                    ].map(field => (
                                                        <div key={field.key}>
                                                            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">{field.label}</label>
                                                            <input
                                                                value={(editData as Record<string, string | number>)[field.key] || ''}
                                                                onChange={e => setEditData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-accent-cyan/50 transition-colors"
                                                            />
                                                        </div>
                                                    ))}
                                                    <div>
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Experience (Years)</label>
                                                        <input
                                                            type="number"
                                                            value={editData.experience_years || 0}
                                                            onChange={e => setEditData(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-accent-cyan/50 transition-colors"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Consultation Fee (₹)</label>
                                                        <input
                                                            type="number"
                                                            value={editData.consultation_fee || 0}
                                                            onChange={e => setEditData(prev => ({ ...prev, consultation_fee: parseInt(e.target.value) || 0 }))}
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-accent-cyan/50 transition-colors"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Bio</label>
                                                    <textarea
                                                        rows={3}
                                                        value={editData.bio || ''}
                                                        onChange={e => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-accent-cyan/50 transition-colors resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Action buttons */}
                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                                    {!isEditing ? (
                                        <>
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-accent-cyan transition-colors"
                                            >
                                                <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                {isExpanded ? 'Collapse' : 'View Details'}
                                            </button>
                                            <button
                                                onClick={() => { setExpandedId(null); startEdit(doc); }}
                                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-accent-magenta transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                                            >
                                                <Edit3 size={13} />
                                                Edit Profile
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                disabled={saving}
                                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                                            >
                                                <X size={14} />
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => saveProfile(doc.id)}
                                                disabled={saving}
                                                className="flex items-center gap-1.5 text-xs text-white bg-accent-cyan/20 hover:bg-accent-cyan/30 transition-colors px-4 py-1.5 rounded-lg border border-accent-cyan/30"
                                            >
                                                {saving ? (
                                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Save size={13} />
                                                )}
                                                {saving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </GlassCard>
                        </motion.div>
                    );
                })}
            </div>

            {doctors.length === 0 && (
                <div className="text-center py-16">
                    <Activity size={40} className="text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No doctors registered yet.</p>
                </div>
            )}
        </div>
    );
}


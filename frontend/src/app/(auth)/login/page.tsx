'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { User, Lock, ArrowRight, Shield, Mail, Edit3, AlertCircle, Phone, Calendar, HeartPulse, MapPin, Contact2, Stethoscope, Eye, EyeOff } from 'lucide-react';
import { DoctorTriageExam } from '@/components/auth/DoctorTriageExam';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import './login.css';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const forcedRole = searchParams.get('role'); // e.g. ?role=admin

    // Framer Motion Variants for Staggered 3D Form Transitions
    const formContainerVariants: Variants = {
        hidden: { opacity: 0, height: 0, transition: { staggerChildren: 0.05, staggerDirection: -1, when: "afterChildren" } },
        show: { opacity: 1, height: 'auto', transition: { staggerChildren: 0.1, delayChildren: 0.1, when: "beforeChildren" } }
    };

    const formItemVariants: Variants = {
        hidden: { opacity: 0, y: -20, rotateX: 90, filter: 'blur(5px)', transformPerspective: 1000 },
        show: { opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)', transition: { type: 'spring', damping: 20, stiffness: 100 } }
    };

    const [isLogin, setIsLogin] = useState(true);
    const [registerRole, setRegisterRole] = useState<'user' | 'doctor'>('user');
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [age, setAge] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [address, setAddress] = useState('');
    const [emergencyContact, setEmergencyContact] = useState('');
    const [orgCode, setOrgCode] = useState('');
    const [website, setWebsite] = useState('');

    // Validation States
    const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    const validateOrgCode = (val: string) => /^[A-Z]{3,8}-\d{4}$/.test(val);
    const validatePhone = (val: string) => {
        try {
            return isValidPhoneNumber(val, 'IN') || isValidPhoneNumber(val); // Default to India but support international
        } catch { return false; }
    };
    const validateAge = (val: string) => {
        const num = parseInt(val);
        return !isNaN(num) && num > 0 && num < 120;
    };

    const getPhoneRegion = (val: string) => {
        try {
            const parsed = parsePhoneNumber(val, 'IN');
            return parsed && parsed.country ? `Region Identified: ${parsed.country}` : '';
        } catch { return ''; }
    };
    
    // UI State
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [showExam, setShowExam] = useState(false);

    const isFormValid = () => {
        if (isLogin) return validateEmail(email) && password.length >= 6;
        
        const basic = validateEmail(email) && password.length >= 6 && name.trim().length > 2;
        if (registerRole === 'doctor') return basic && validateOrgCode(orgCode);
        return basic && validatePhone(phoneNumber) && validateAge(age) && bloodGroup !== '';
    };

    // Masking Handlers
    const handleNameChange = (val: string) => {
        const masked = val.replace(/[0-9]/g, ''); // Strip numbers
        setName(masked);
    };

    const handlePhoneChange = (val: string) => {
        const digits = val.replace(/\D/g, '');
        let formatted = digits;
        if (digits.length > 3 && digits.length <= 6) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        else if (digits.length > 6) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
        setPhoneNumber(formatted);
    };

    const handleAgeChange = (val: string) => {
        const digits = val.replace(/\D/g, '');
        if (digits.length <= 3) setAge(digits);
    };

    // Sync state with 3D Canvas
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('dignova_login_state', { 
            detail: { isRegistering: !isLogin, role: registerRole, isTransitioning } 
        }));
    }, [isLogin, registerRole, isTransitioning]);

    const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || 'https://dignova-ai.onrender.com';

    const triggerHyperspaceAndRoute = (targetUrl: string) => {
        setIsTransitioning(true); // Engages the 3D portal
        setTimeout(() => {
            router.push(targetUrl);
        }, 1500); // Wait 1.5s for the hyper jump animation to complete
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append('grant_type', 'password');
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetch(`${apiBaseURL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Login failed');

            localStorage.setItem('access_token', data.access_token);

            // Fetch me to determine routing
            const meRes = await fetch(`${apiBaseURL}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            const userData = await meRes.json().catch(() => ({}));

            // Decide route
            // Decide route based on role
            let targetRoute = '/user';
            const role = userData.role || '';
            if (role === 'super_admin') targetRoute = '/admin';
            else if (role === 'org_admin') targetRoute = '/org-admin';
            else if (role === 'receptionist') targetRoute = '/org-admin';
            else if (role === 'doctor') {
                targetRoute = userData.tier === 'intern' ? '/intern' : '/doctor';
            }
            
            triggerHyperspaceAndRoute(targetRoute);

        } catch (err: any) {
            setErrorMsg(err.message || String(err));
            setLoading(false);
        }
    };

    const initiateRegistration = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        
        if (registerRole === 'doctor') {
            setShowExam(true); // Launch Exam
        } else {
            handleRegisterSubmit(null); // Direct User registration
        }
    };

    const handleRegisterSubmit = async (doctorTier: 'intern' | 'mid_range' | 'experienced' | null) => {
        setLoading(true);
        setShowExam(false);

        try {
            const payload = {
                name, email, phone_number: phoneNumber, 
                age: age ? parseInt(age) : null, blood_group: bloodGroup, 
                address, emergency_contact: emergencyContact, 
                password, role: registerRole, tier: doctorTier,
                org_code: orgCode, website
            };

            const res = await fetch(`${apiBaseURL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || 'Registration failed');

            setIsLogin(true);
            setErrorMsg("Registration successful! Please check your email to verify your account.");
            
        } catch (err: any) {
            setErrorMsg(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full min-h-screen overflow-y-auto bg-transparent scrollbar-hide">
            {/* 3D Scene now provided by GlobalCanvas */}

            {/* Doctor Triage Exam Overlay */}
            <AnimatePresence>
                {showExam && (
                    <DoctorTriageExam 
                        onComplete={handleRegisterSubmit} 
                        onCancel={() => setShowExam(false)} 
                    />
                )}
            </AnimatePresence>

            {/* UI Layer */}
            <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
                <AnimatePresence mode="wait">
                    {!isTransitioning && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', rotateZ: 0 }}
                            exit={{ 
                                opacity: 0, 
                                scale: 5, 
                                y: -100, 
                                filter: 'blur(30px)',
                                rotateZ: -5
                            }}
                            transition={{ duration: 0.8, ease: "easeIn" }}
                            className="w-full max-w-2xl sm:w-[500px] lg:w-[600px] mt-12 mb-20"
                        >
                            <GlassCard className="p-8 border-white/10 shadow-2xl shadow-black/50 backdrop-blur-2xl bg-black/40 overflow-visible">
                                
                                {/* 1. Doctor Context Switcher (TOP) - Based on TalentLink Reference */}
                                <div className="text-center mb-10 pb-6 border-b border-white/5">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const newRole = registerRole === 'user' ? 'doctor' : 'user';
                                            setRegisterRole(newRole);
                                            setErrorMsg('');
                                        }}
                                        className={`px-8 py-2.5 rounded-full border font-bold text-sm transition-all duration-500 transform active:scale-95 ${
                                            registerRole === 'doctor' 
                                            ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                                            : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40'
                                        }`}
                                    >
                                        {registerRole === 'doctor' ? 'Switch to Patient Portal' : 'Login / Register as Doctor'}
                                    </button>
                                    <div className="text-white/40 text-[10px] uppercase tracking-widest mt-3 font-mono">
                                        {registerRole === 'doctor' ? 'Are you a patient? Click above.' : 'Are you a healthcare professional? Click above.'}
                                    </div>
                                </div>
                                
                                <div className="text-center mb-8 relative">
                                    {/* Biometric Feedback Widget */}
                                    <div className="absolute -top-4 -right-4 flex flex-col items-end gap-1 opacity-40 hover:opacity-100 transition-opacity">
                                        <div className="flex gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <motion.div 
                                                    key={i}
                                                    className="w-1 h-3 bg-accent-cyan rounded-full"
                                                    animate={{ 
                                                        height: [4, 12, 4],
                                                        opacity: [0.3, 1, 0.3]
                                                    }}
                                                    transition={{ 
                                                        duration: 1.5, 
                                                        repeat: Infinity, 
                                                        delay: i * 0.1 
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[8px] font-mono text-accent-cyan uppercase tracking-tighter">Neural_Link_Stable</span>
                                    </div>

                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-white/5 mb-4 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                                        {registerRole === 'doctor' ? <Stethoscope className="text-emerald-400" /> : forcedRole === 'admin' ? <Shield className="text-white/80" /> : <User className="text-white/80" />}
                                    </div>
                                    <h2 className={`text-2xl font-light tracking-wide uppercase ${registerRole === 'doctor' ? 'text-emerald-400' : 'text-white'}`}>
                                        {isLogin ? (registerRole === 'doctor' ? 'MD Secure Login' : 'Initialize Session') : (registerRole === 'doctor' ? 'Medical Registration' : 'Establish Node')}
                                    </h2>
                                    <p className="text-xs text-white/40 font-mono mt-2 uppercase tracking-widest">
                                        {isLogin ? (registerRole === 'doctor' ? 'Doctor Access Restricted' : 'Authenticate to access network') : 'Register your signature'}
                                    </p>
                                </div>

                                {/* Login / Register Tabs */}
                                <div className="flex bg-white/5 rounded-full p-1 mb-8 border border-white/10">
                                    <button 
                                        type="button"
                                        onClick={() => { setIsLogin(true); setErrorMsg(''); }}
                                        className={`flex-1 text-xs uppercase tracking-widest py-2.5 rounded-full transition-all duration-300 ${isLogin ? 'bg-white text-black font-semibold' : 'text-white/50 hover:text-white/80'}`}
                                    >
                                        Sign In
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { setIsLogin(false); setErrorMsg(''); }}
                                        className={`flex-1 text-xs uppercase tracking-widest py-2.5 rounded-full transition-all duration-300 ${!isLogin ? 'bg-white text-black font-semibold' : 'text-white/50 hover:text-white/80'}`}
                                    >
                                        Register
                                    </button>
                                </div>

                                <form onSubmit={isLogin ? handleLoginSubmit : initiateRegistration} className="space-y-4">
                                    {errorMsg && (
                                        <div className="p-3 text-xs tracking-wide text-center rounded border border-white/10 bg-white/5 flex items-center justify-center gap-2">
                                            <AlertCircle size={14} className={errorMsg.includes('successful') ? "text-emerald-400" : "text-rose-400"} />
                                            <span className={errorMsg.includes('successful') ? "text-emerald-400" : "text-rose-400"}>{errorMsg}</span>
                                        </div>
                                    )}
                                    <AnimatePresence>
                                        {!isLogin && (
                                            <motion.div
                                                variants={formContainerVariants}
                                                initial="hidden"
                                                animate="show"
                                                exit="hidden"
                                                className="space-y-4 overflow-hidden"
                                            >
                                                <motion.div variants={formItemVariants}>
                                                    <GlassInput 
                                                        type="text" 
                                                        placeholder="Full Name (Alphabetical only)" 
                                                        icon={<Edit3 size={16} />} 
                                                        value={name} 
                                                        onChange={e => handleNameChange(e.target.value)} 
                                                        isValid={name.length > 2}
                                                        isInvalid={name.length > 0 && name.length <= 2}
                                                        errorText="Name must be at least 3 characters"
                                                        required 
                                                    />
                                                </motion.div>

                                                {registerRole === 'doctor' && (
                                                    <motion.div variants={formItemVariants}>
                                                        <GlassInput 
                                                            type="text" 
                                                            placeholder="Org Code (e.g. HOSP-2026)" 
                                                            icon={<Shield size={16} />} 
                                                            value={orgCode} 
                                                            onChange={e => setOrgCode(e.target.value.toUpperCase())} 
                                                            isValid={validateOrgCode(orgCode)}
                                                            isInvalid={orgCode.length > 0 && !validateOrgCode(orgCode)}
                                                            errorText="Format: 3-8 uppercase letters followed by 4 digits (e.g. AI-9999)"
                                                            required 
                                                        />
                                                    </motion.div>
                                                )}

                                                {registerRole === 'user' && ( 
                                                    <>
                                                        <motion.div variants={formItemVariants}>
                                                            <GlassInput 
                                                                type="text" 
                                                                placeholder="Phone Number (e.g. +91 ...)" 
                                                                icon={<Phone size={16} />} 
                                                                value={phoneNumber} 
                                                                onChange={e => handlePhoneChange(e.target.value)} 
                                                                isValid={validatePhone(phoneNumber)}
                                                                isInvalid={phoneNumber.length > 5 && !validatePhone(phoneNumber)}
                                                                errorText={phoneNumber.length > 5 && !validatePhone(phoneNumber) ? "Invalid International Format" : getPhoneRegion(phoneNumber)}
                                                                required 
                                                            />
                                                        </motion.div>
                                                        <motion.div variants={formItemVariants} className="grid grid-cols-2 gap-4">
                                                            <GlassInput 
                                                                type="text" 
                                                                placeholder="Age" 
                                                                icon={<Calendar size={16} />} 
                                                                value={age} 
                                                                onChange={e => handleAgeChange(e.target.value)} 
                                                                isValid={validateAge(age)}
                                                                isInvalid={age.length > 0 && !validateAge(age)}
                                                                errorText="Invalid age (1-119)"
                                                            />
                                                            <div className="relative">
                                                                <HeartPulse size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
                                                                <select 
                                                                    className={`glass-input pl-12 w-full appearance-none transition-all duration-300 ${bloodGroup ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
                                                                    value={bloodGroup}
                                                                    onChange={e => setBloodGroup(e.target.value)}
                                                                >
                                                                    <option value="" disabled className="bg-black text-gray-500">Blood Group</option>
                                                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                                                                        <option key={type} value={type} className="bg-black text-white">{type}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </motion.div>
                                                        <motion.div variants={formItemVariants}>
                                                            <GlassInput 
                                                                type="text" 
                                                                placeholder="Emergency Contact" 
                                                                icon={<Contact2 size={16} />} 
                                                                value={emergencyContact} 
                                                                onChange={e => setEmergencyContact(e.target.value)} 
                                                                isValid={validatePhone(emergencyContact)}
                                                                isInvalid={emergencyContact.length > 5 && !validatePhone(emergencyContact)}
                                                                errorText={getPhoneRegion(emergencyContact)}
                                                            />
                                                        </motion.div>
                                                        <motion.div variants={formItemVariants}>
                                                            <GlassInput type="text" placeholder="Current Address" icon={<MapPin size={16} />} value={address} onChange={e => setAddress(e.target.value)} />
                                                        </motion.div>
                                                    </>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <GlassInput 
                                        type="email" 
                                        placeholder="Email Address" 
                                        icon={<Mail size={16} />} 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        isValid={validateEmail(email)}
                                        isInvalid={email.length > 0 && !validateEmail(email)}
                                        errorText="Please enter a valid email address"
                                        required 
                                    />
                                    
                                    <div className="relative">
                                        <GlassInput 
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="Password (Min. 6 chars)" 
                                            icon={<Lock size={16} />} 
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)} 
                                            isValid={password.length >= 6}
                                            isInvalid={password.length > 0 && password.length < 6}
                                            errorText="Password must be at least 6 characters"
                                            required 
                                            endIcon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            onEndIconClick={() => setShowPassword(!showPassword)}
                                        />
                                        {isLogin && (
                                            <div className="text-right mt-2">
                                                <a href="#forgot" className="inline-block text-[10px] text-white/40 hover:text-white transition-colors duration-200 uppercase tracking-widest mt-1">
                                                    Forgot Terminal Code?
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    <GlassButton 
                                        type="submit" 
                                        variant="primary" 
                                        className={`w-full mt-6 justify-center transition-all duration-500 ${isFormValid() ? 'bg-white text-black' : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'}`} 
                                        disabled={loading || !isFormValid()}
                                    >
                                        <span>
                                            {loading ? 'Processing...' : (
                                                isLogin ? 'Access Terminal' : (
                                                    registerRole === 'doctor' ? 'Begin Triage Assessment' : 'Initialize Account'
                                                )
                                            )}
                                        </span>
                                        {!loading && <ArrowRight size={16} className={`ml-2 transition-opacity ${isFormValid() ? 'opacity-50' : 'opacity-0'}`} />}
                                    </GlassButton>
                                    {/* Honeypot field to trap spam bots */}
                                    <input 
                                        type="text" 
                                        name="website" 
                                        value={website} 
                                        onChange={e => setWebsite(e.target.value)} 
                                        style={{ display: 'none' }} 
                                        tabIndex={-1} 
                                        autoComplete="off" 
                                    />
                                </form>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-black"><p className="text-white/50 uppercase tracking-widest text-sm animate-pulse">Initializing Portal...</p></div>}>
            <LoginContent />
        </Suspense>
    );
}


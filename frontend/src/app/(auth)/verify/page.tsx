'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { ShieldCheck, XCircle, Loader2, ArrowRight } from 'lucide-react';

function VerifyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your security clearance...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link. Token missing.');
            return;
        }

        const verifyToken = async () => {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dignova-ai.onrender.com';
                const res = await fetch(`${baseUrl}/api/auth/verify?token=${token}`);
                const data = await res.json().catch(() => ({}));
                
                if (res.ok) {
                    setStatus('success');
                    setMessage(data.message || 'Email verified successfully!');
                } else {
                    setStatus('error');
                    setMessage(data.detail || 'Verification failed. Link may be expired.');
                }
            } catch (err) {
                setStatus('error');
                setMessage(err instanceof Error ? err.message : 'Could not connect to the verification server.');
            }
        };

        verifyToken();
    }, [token]);

    return (
        <GlassCard className="max-w-md mx-auto mt-20 p-8 text-center">
            <div className="flex flex-col items-center gap-6">
                <div className="p-4 rounded-full bg-white/5 border border-white/10">
                    {status === 'loading' && <Loader2 className="text-accent-cyan animate-spin" size={48} />}
                    {status === 'success' && <ShieldCheck className="text-success" size={48} />}
                    {status === 'error' && <XCircle className="text-danger" size={48} />}
                </div>

                <h2 className="text-2xl font-bold tracking-tight">
                    {status === 'loading' ? 'Security Verification' : status === 'success' ? 'Access Granted' : 'Verification Failed'}
                </h2>
                
                <p className="text-gray-400">
                    {message}
                </p>

                {(status === 'success' || status === 'error') && (
                    <GlassButton 
                        variant="primary" 
                        className="w-full justify-center mt-4"
                        onClick={() => router.push('/login')}
                    >
                        <span>Return to Login</span>
                        <ArrowRight size={18} />
                    </GlassButton>
                )}
            </div>
        </GlassCard>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-black"><p className="text-accent-cyan animate-pulse text-xl">Loading Terminal...</p></div>}>
            <VerifyContent />
        </Suspense>
    );
}


'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { Mail, ArrowRight, AlertCircle, Key } from 'lucide-react';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dignova-ai.onrender.com';
            const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json().catch(() => ({}));
            setStatus('success');
            setMessage(data.message || 'If that email is registered, a reset link has been sent.');
        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'Network error. Could not request password reset.');
        }
    };

    return (
        <GlassCard className="max-w-md mx-auto mt-20 p-8">
            <div className="text-center mb-8">
                <div className="flex justify-center mb-6">
                    <div className="p-4 rounded-full bg-white/5 border border-white/10">
                        <Key className="text-accent-cyan" size={32} />
                    </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Recover Access</h2>
                <p className="text-gray-400 mt-2">Enter your email to receive a reset link</p>
            </div>

            <form onSubmit={handleForgot} className="space-y-6">
                {message && (
                    <div className="p-3 text-sm text-center rounded bg-white/5 border border-white/10 flex items-center justify-center gap-2">
                        <AlertCircle size={16} className={status === 'success' ? "text-success" : "text-danger"} />
                        <span className={status === 'success' ? "text-success" : "text-danger"}>{message}</span>
                    </div>
                )}

                <div className="form-group">
                    <GlassInput
                        type="email"
                        placeholder="Security Email"
                        icon={<Mail size={18} />}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <GlassButton 
                    type="submit" 
                    variant="primary" 
                    className="w-full justify-center" 
                    disabled={status === 'loading' || status === 'success'}
                >
                    <span>{status === 'loading' ? 'Encrypting Request...' : 'Request Reset Link'}</span>
                    {status !== 'loading' && <ArrowRight size={18} />}
                </GlassButton>

                <p className="text-center text-sm text-gray-400 mt-6">
                    Remember your credentials?
                    <button 
                        type="button" 
                        onClick={() => router.push('/login')} 
                        className="ml-2 text-accent-cyan hover:underline"
                    >
                        Sign In
                    </button>
                </p>
            </form>
        </GlassCard>
    );
}


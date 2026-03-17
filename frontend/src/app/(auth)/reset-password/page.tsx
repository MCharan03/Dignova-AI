'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { Lock, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match.');
            return;
        }

        if (!token) {
            setStatus('error');
            setMessage('Security token is missing.');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: newPassword })
            });

            const data = await res.json();
            if (res.ok) {
                setStatus('success');
                setMessage('Password updated successfully! Redirecting...');
                setTimeout(() => router.push('/login'), 2000);
            } else {
                setStatus('error');
                setMessage(data.detail || 'Failed to reset password.');
            }
        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'Network error. Could not update password.');
        }
    };

    return (
        <GlassCard className="max-w-md mx-auto mt-20 p-8">
            <div className="text-center mb-8">
                <div className="flex justify-center mb-6">
                    <div className="p-4 rounded-full bg-white/5 border border-white/10">
                        <ShieldAlert className="text-accent-magenta" size={32} />
                    </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Set New Password</h2>
                <p className="text-gray-400 mt-2">Enter your new security credentials</p>
            </div>

            <form onSubmit={handleReset} className="space-y-6">
                {message && (
                    <div className="p-3 text-sm text-center rounded bg-white/5 border border-white/10 flex items-center justify-center gap-2">
                        <AlertCircle size={16} className={status === 'success' ? "text-success" : "text-danger"} />
                        <span className={status === 'success' ? "text-success" : "text-danger"}>{message}</span>
                    </div>
                )}

                <div className="form-group">
                    <GlassInput
                        type="password"
                        placeholder="New Password"
                        icon={<Lock size={18} />}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <GlassInput
                        type="password"
                        placeholder="Confirm New Password"
                        icon={<Lock size={18} />}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>

                <GlassButton 
                    type="submit" 
                    variant="primary" 
                    className="w-full justify-center" 
                    disabled={status === 'loading' || status === 'success'}
                >
                    <span>{status === 'loading' ? 'Updating Credentials...' : 'Overwrite Password'}</span>
                    {status !== 'loading' && <ArrowRight size={18} />}
                </GlassButton>
            </form>
        </GlassCard>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-black"><p className="text-accent-cyan animate-pulse text-xl">Accessing Secure Channel...</p></div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}


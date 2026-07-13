// Verify page – reads token from query, calls backend verify endpoint, and shows result
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface VerifyResult {
  message: string;
}

export default function Verify() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    if (!token) return;
    const verify = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
        const resp = await fetch(`${backendUrl}/auth/verify?token=${token}`);
        const data: VerifyResult = await resp.json();
        if (resp.ok) {
          setStatus('success');
          setMsg(data.message ?? 'Email verified successfully!');
        } else {
          setStatus('error');
          setMsg(data.detail ?? data.message ?? 'Verification failed');
        }
      } catch (e) {
        setStatus('error');
        setMsg('Network error while verifying email');
      }
    };
    verify();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white px-4">
      <div className="max-w-lg space-y-6 text-center">
        {status === 'loading' && <p className="text-xl">Verifying your email…</p>}
        {status === 'success' && (
          <>
            <h1 className="text-3xl font-bold">✅ {msg}</h1>
            <p className="mt-4">
              You can now <a href="/login" className="underline">log in</a> to your account.
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-3xl font-bold text-red-400">❌ {msg}</h1>
            <p className="mt-4">
              If the link has expired, you can request a new verification email from the login page.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

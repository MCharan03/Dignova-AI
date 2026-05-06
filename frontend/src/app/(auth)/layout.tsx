'use client';

import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative min-h-screen flex items-center justify-center bg-transparent text-gray-200 overflow-hidden">
            <div className="fixed inset-0 pointer-events-none bg-[url('/noise.png')] opacity-5 z-20"></div>
            <div className="fixed inset-0 pointer-events-none z-20 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.02)_50%)] bg-[length:100%_4px] scanlines"></div>

            {/* 3D background is now handled globally by GlobalCanvas in RootLayout */}

            <div className="z-30 w-full h-full min-h-screen flex">
                {children}
            </div>
        </div>
    );
}

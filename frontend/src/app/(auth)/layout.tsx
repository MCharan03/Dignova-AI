'use client';

import React from 'react';
import { BackgroundScene } from '@/components/3d/BackgroundScene';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative min-h-screen flex items-center justify-center bg-background text-gray-200 overflow-hidden">
            <div className="fixed inset-0 pointer-events-none bg-[url('/noise.png')] opacity-5 z-20"></div>
            <div className="fixed inset-0 pointer-events-none z-20 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.02)_50%)] bg-[length:100%_4px] scanlines"></div>

            <div className="absolute inset-0 z-0 opacity-60 mix-blend-screen overflow-hidden">
                <BackgroundScene />
            </div>

            <div className="z-30 w-full h-full min-h-screen flex">
                {children}
            </div>
        </div>
    );
}


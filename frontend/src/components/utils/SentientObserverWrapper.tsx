'use client';

import React from 'react';
import { useSentientObserver } from '@/hooks/useSentientObserver';

export default function SentientObserverWrapper({ children }: { children: React.ReactNode }) {
    useSentientObserver();
    return <>{children}</>;
}

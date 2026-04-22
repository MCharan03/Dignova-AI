'use client';

import { useState, useEffect } from 'react';

export function useNetworkResilience() {
    const [survivorMode, setSurvivorMode] = useState(false);
    const [speed, setSpeed] = useState<number | null>(null);

    useEffect(() => {
        // Use the Network Information API if available
        const nav = navigator as any;
        const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

        const checkResilience = () => {
            if (connection) {
                // effectiveType: 'slow-2g', '2g', '3g', '4g'
                // downlink: speed in Mbps
                const isSlow = connection.effectiveType === 'slow-2g' || 
                               connection.effectiveType === '2g' || 
                               (connection.downlink && connection.downlink < 1.5);
                
                setSurvivorMode(isSlow);
                setSpeed(connection.downlink);
                
                if (isSlow) {
                    document.documentElement.classList.add('survivor-mode');
                    console.warn("Dignova Sentient OS: low bandwidth detected. Activating Survivor Mode.");
                } else {
                    document.documentElement.classList.remove('survivor-mode');
                }
            }
        };

        if (connection) {
            connection.addEventListener('change', checkResilience);
            checkResilience();
        }

        return () => {
            if (connection) connection.removeEventListener('change', checkResilience);
        };
    }, []);

    return { survivorMode, speed };
}

'use client';

import { useEffect, useRef, useState } from 'react';

export function useSentientObserver() {
    const [telemetry, setTelemetry] = useState({
        stress: 0,
        jitter: 0,
        cadence: 0
    });

    const mouseLog = useRef<{ x: number, y: number, t: number }[]>([]);
    const lastKeyTime = useRef<number>(Date.now());
    const lastUpdate = useRef<number>(0);
    
    // Internal smoothing values
    const smoothJitter = useRef(0);
    const smoothCadence = useRef(0);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const now = Date.now();
            mouseLog.current.push({ x: e.clientX, y: e.clientY, t: now });
            
            if (mouseLog.current.length > 50) {
                mouseLog.current.shift();
                
                // Calculate raw Jitter
                let totalDeviance = 0;
                for (let i = 2; i < mouseLog.current.length; i++) {
                    const prev = mouseLog.current[i-1];
                    const curr = mouseLog.current[i];
                    const dist = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
                    totalDeviance += dist;
                }
                
                const rawJitter = Math.min(totalDeviance / 1500, 1);
                // Apply Exponential Moving Average (EMA) for smoothing
                smoothJitter.current = (smoothJitter.current * 0.9) + (rawJitter * 0.1);
            }

            // Throttle updates to ~60fps
            if (now - lastUpdate.current > 16) {
                updateTelemetry(now);
            }
        };

        const handleKeyDown = () => {
            const now = Date.now();
            const diff = now - lastKeyTime.current;
            lastKeyTime.current = now;
            
            const rawCadence = Math.max(0, 1 - (diff / 1000));
            smoothCadence.current = (smoothCadence.current * 0.8) + (rawCadence * 0.2);
            
            updateTelemetry(now);
        };

        const updateTelemetry = (now: number) => {
            lastUpdate.current = now;
            
            // Gradually decay cadence if no typing
            if (now - lastKeyTime.current > 2000) {
                smoothCadence.current *= 0.95;
            }

            const stress = (smoothJitter.current * 0.7) + (smoothCadence.current * 0.3);
            
            setTelemetry({
                jitter: smoothJitter.current,
                cadence: smoothCadence.current,
                stress: stress
            });

            // Push to Global CSS for hardware-accelerated reactions
            document.documentElement.style.setProperty('--sentient-stress', stress.toString());
        };

        // Periodic decay check
        const decayInterval = setInterval(() => {
            const now = Date.now();
            if (now - lastUpdate.current > 100) {
                smoothJitter.current *= 0.98;
                updateTelemetry(now);
            }
        }, 100);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('keydown', handleKeyDown);
            clearInterval(decayInterval);
        };
    }, []);

    return telemetry;
}

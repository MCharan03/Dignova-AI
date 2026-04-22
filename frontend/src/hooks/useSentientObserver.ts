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

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const now = Date.now();
            mouseLog.current.push({ x: e.clientX, y: e.clientY, t: now });
            
            if (mouseLog.current.length > 50) {
                mouseLog.current.shift();
                
                // Calculate Jitter (erratic movement)
                let totalDeviance = 0;
                for (let i = 2; i < mouseLog.current.length; i++) {
                    const prev = mouseLog.current[i-1];
                    const curr = mouseLog.current[i];
                    const dist = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
                    totalDeviance += dist;
                }
                
                const jitter = Math.min(totalDeviance / 1000, 1);
                setTelemetry(prev => ({ ...prev, jitter }));
            }
        };

        const handleKeyDown = () => {
            const now = Date.now();
            const diff = now - lastKeyTime.current;
            lastKeyTime.current = now;
            
            // Cadence (speed of thought/typing)
            const cadence = Math.max(0, 1 - (diff / 1000));
            setTelemetry(prev => ({ ...prev, cadence }));
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Derived Stress Level
    useEffect(() => {
        const stress = (telemetry.jitter * 0.7) + (telemetry.cadence * 0.3);
        setTelemetry(prev => ({ ...prev, stress }));
        
        // Push to Global Canvas via CSS variable for shader reaction
        document.documentElement.style.setProperty('--sentient-stress', stress.toString());
    }, [telemetry.jitter, telemetry.cadence]);

    return telemetry;
}

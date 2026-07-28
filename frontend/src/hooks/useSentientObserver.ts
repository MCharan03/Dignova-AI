'use client';

import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '@/lib/api';

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

    // Keystroke Dynamics Tracking
    const keyTimes = useRef<Record<string, number>>({});
    const lastKeyReleaseTime = useRef<number>(0);
    const totalKeysPressed = useRef(0);
    const backspaceCount = useRef(0);
    const holdTimes = useRef<number[]>([]);
    const flightTimes = useRef<number[]>([]);

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

        const handleKeyDown = (e: KeyboardEvent) => {
            const now = Date.now();
            const diff = now - lastKeyTime.current;
            lastKeyTime.current = now;
            
            const rawCadence = Math.max(0, 1 - (diff / 1000));
            smoothCadence.current = (smoothCadence.current * 0.8) + (rawCadence * 0.2);

            // Track Flight Time (time between last release and current keypress)
            if (lastKeyReleaseTime.current > 0) {
                const flight = now - lastKeyReleaseTime.current;
                if (flight < 5000) { // filter out long breaks
                    flightTimes.current.push(flight);
                }
            }

            // Track key hold start
            if (!keyTimes.current[e.key]) {
                keyTimes.current[e.key] = now;
            }

            totalKeysPressed.current += 1;
            if (e.key === 'Backspace') {
                backspaceCount.current += 1;
            }
            
            updateTelemetry(now);
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const now = Date.now();
            lastKeyReleaseTime.current = now;

            // Track Hold Time (time key was pressed down)
            const pressTime = keyTimes.current[e.key];
            if (pressTime) {
                const hold = now - pressTime;
                if (hold < 3000) { // filter out sticky keys
                    holdTimes.current.push(hold);
                }
                delete keyTimes.current[e.key];
            }
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

        // Periodically report telemetry to the backend (every 30 seconds)
        const reportingInterval = setInterval(async () => {
            const token = localStorage.getItem('access_token');
            if (!token || totalKeysPressed.current === 0) return;

            const avgHold = holdTimes.current.length > 0
                ? holdTimes.current.reduce((a, b) => a + b, 0) / holdTimes.current.length
                : 0.0;
            const avgFlight = flightTimes.current.length > 0
                ? flightTimes.current.reduce((a, b) => a + b, 0) / flightTimes.current.length
                : 0.0;
            const backspaceRatio = totalKeysPressed.current > 0
                ? backspaceCount.current / totalKeysPressed.current
                : 0.0;

            // Calculate simple WPM: (keys / 5) * 2 (since it's a 30s window)
            const wpm = (totalKeysPressed.current / 5) * 2;

            try {
                const response = await fetch(apiUrl('/api/telemetry/log'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        wpm: wpm,
                        avg_hold_time: avgHold,
                        avg_flight_time: avgFlight,
                        backspace_ratio: backspaceRatio
                    })
                });
                
                if (response.ok) {
                    const data = await response.json().catch(() => ({}));
                    if (data.stress_score > 0.7) {
                        console.warn(`[SENTIENT TELEMETRY] High stress detected: ${data.stress_score}`);
                    }
                }
            } catch (err) {
                console.error('[SENTIENT TELEMETRY] Failed to post telemetry log:', err);
            }

            // Reset buffers
            totalKeysPressed.current = 0;
            backspaceCount.current = 0;
            holdTimes.current = [];
            flightTimes.current = [];
        }, 30000);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            clearInterval(decayInterval);
            clearInterval(reportingInterval);
        };
    }, []);

    return telemetry;
}

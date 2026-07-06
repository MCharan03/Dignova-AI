'use client';

import { useEffect, useRef, useState } from 'react';

interface Position {
    x: number;
    y: number;
}

export function useIntentionStabilizer() {
    const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
    const [isAiming, setIsAiming] = useState(false);
    const [isScrollLocked, setIsScrollLocked] = useState(false);

    const lastPos = useRef<Position>({ x: 0, y: 0 });
    const velocities = useRef<number[]>([]);
    const lastTime = useRef<number>(Date.now());
    const isScrolling = useRef<boolean>(false);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const now = Date.now();
            const dt = now - lastTime.current;
            lastTime.current = now;

            if (dt <= 0) return;

            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const velocity = distance / dt; // pixels per ms

            // Keep rolling velocity window (last 10 moves)
            velocities.current.push(velocity);
            if (velocities.current.length > 10) {
                velocities.current.shift();
            }

            const avgVelocity = velocities.current.reduce((a, b) => a + b, 0) / velocities.current.length;

            // Aiming Stabilization:
            // If speed is extremely slow (< 0.08 px/ms), freeze/stabilize coordinates to prevent jitter (pre-click aim lock)
            const aimingThreshold = 0.08;
            const shouldFreeze = avgVelocity < aimingThreshold && distance < 3;

            setIsAiming(avgVelocity < aimingThreshold);

            // Axis lock during scrolling:
            // Lock X coordinate if scrolling is active to prevent side-to-side drift jitter
            if (isScrolling.current) {
                setPosition({ x: lastPos.current.x, y: e.clientY }); // Lock X, update Y only
                lastPos.current = { x: lastPos.current.x, y: e.clientY };
            } else if (shouldFreeze) {
                // Aim Lock: freeze position
                setPosition(lastPos.current);
            } else {
                // Free movement
                setPosition({ x: e.clientX, y: e.clientY });
                lastPos.current = { x: e.clientX, y: e.clientY };
            }
        };

        const handleScroll = () => {
            isScrolling.current = true;
            setIsScrollLocked(true);

            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }

            scrollTimeout.current = setTimeout(() => {
                isScrolling.current = false;
                setIsScrollLocked(false);
            }, 250); // reset scroll state after 250ms of inactivity
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, []);

    return {
        x: position.x,
        y: position.y,
        isAiming,
        isScrollLocked
    };
}

'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
    children: React.ReactNode;
    className?: string;
    intensity?: number;
    stabilize?: boolean; // New prop for Intention Stabilization
}

/**
 * TiltCard with "Intention Stabilization"
 * Prevents jitter by locking axes when a clear directional movement is detected.
 * Freezes the cursor 'aim' when hovering close to the center for precision.
 */
export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', intensity = 15, stabilize = true }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [lockedAxis, setLockedAxis] = useState<'x' | 'y' | null>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
    const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${intensity}deg`, `-${intensity}deg`]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${intensity}deg`, `${intensity}deg`]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        
        const width = rect.width;
        const height = rect.height;
        
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        let xPct = mouseX / width - 0.5;
        let yPct = mouseY / height - 0.5;

        // --- Intention Stabilization Logic ---
        if (stabilize) {
            const threshold = 0.15; // Inner "Deadzone" for intention stabilization
            const axialThreshold = 0.08; // Threshold to lock onto an axis

            // 1. Center Lock (Precision Aiming)
            // If mouse is near center, freeze the tilt to allow precise interaction with content
            if (Math.abs(xPct) < 0.05 && Math.abs(yPct) < 0.05) {
                xPct = 0;
                yPct = 0;
            }

            // 2. Axial Locking (Lock axes during specific modes)
            // If movement is predominantly horizontal or vertical, lock the other axis
            if (!lockedAxis) {
                if (Math.abs(xPct) > threshold && Math.abs(yPct) < axialThreshold) {
                    setLockedAxis('x');
                } else if (Math.abs(yPct) > threshold && Math.abs(xPct) < axialThreshold) {
                    setLockedAxis('y');
                }
            } else {
                // If we are locked, check if we should release the lock (user moved back towards center)
                if (lockedAxis === 'x' && Math.abs(xPct) < 0.1) setLockedAxis(null);
                if (lockedAxis === 'y' && Math.abs(yPct) < 0.1) setLockedAxis(null);
                
                // Apply the lock
                if (lockedAxis === 'x') yPct = 0;
                if (lockedAxis === 'y') xPct = 0;
            }
        }
        
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        setLockedAxis(null);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                willChange: "transform",
            }}
            className={`w-full ${className}`}
        >
            <div 
                style={{ 
                    transform: "translateZ(30px)", // Lifts the children slightly for 3D depth
                    transformStyle: "preserve-3d",
                    backfaceVisibility: "hidden",
                }} 
                className="w-full h-full"
            >
               {children}
            </div>
        </motion.div>
    );
};

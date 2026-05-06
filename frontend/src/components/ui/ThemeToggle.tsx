'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Check system preference then localStorage on mount
        const stored = localStorage.getItem('dignova-theme');
        if (stored) {
            const dark = stored === 'dark';
            setIsDark(dark);
            document.documentElement.setAttribute('data-theme', stored);
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            setIsDark(false);
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, []);

    const toggle = () => {
        const next = isDark ? 'light' : 'dark';
        setIsDark(!isDark);
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('dignova-theme', next);
    };

    return (
        <motion.button
            onClick={toggle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all overflow-hidden"
            aria-label="Toggle theme"
        >
            <motion.div
                animate={{ rotate: isDark ? 0 : 180, opacity: isDark ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Moon size={16} className="text-accent-cyan" />
            </motion.div>
            <motion.div
                animate={{ rotate: isDark ? -180 : 0, opacity: isDark ? 0 : 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Sun size={16} className="text-amber-400" />
            </motion.div>
            {/* Spacer to keep button width */}
            <div className="w-4 h-4 opacity-0"><Moon size={16} /></div>
        </motion.button>
    );
}

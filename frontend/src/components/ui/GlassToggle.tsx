'use client';

import React, { useState } from 'react';

interface GlassToggleProps {
    initialState?: boolean;
    onChange?: (state: boolean) => void;
    label?: string;
    className?: string; // Add className prop
}

export function GlassToggle({ initialState = false, onChange, label, className = '' }: GlassToggleProps) {
    const [isOn, setIsOn] = useState(initialState);

    const handleToggle = () => {
        const newState = !isOn;
        setIsOn(newState);
        if (onChange) onChange(newState);
    };

    return (
        <div className={`glass-toggle-container ${className}`} onClick={handleToggle}>
            {label && <span className="glass-toggle-label">{label}</span>}
            <div className={`glass-toggle ${isOn ? 'on' : 'off'}`}>
                <div className="glass-toggle-thumb" />
            </div>
        </div>
    );
}


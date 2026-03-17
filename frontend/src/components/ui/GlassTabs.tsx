'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Tab {
    id: string;
    label: string;
}

interface GlassTabsProps {
    tabs: Tab[];
    defaultTab?: string;
    onChange?: (tabId: string) => void;
    className?: string; // Added className here
}

export function GlassTabs({ tabs, defaultTab, onChange, className = '' }: GlassTabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

    const handleTabClick = (id: string) => {
        setActiveTab(id);
        if (onChange) onChange(id);
    };

    return (
        <div className={`glass-tabs-container ${className}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`glass-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="active-tab-indicator"
                            className="glass-tab-indicator"
                            initial={false}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                    )}
                    <span className="glass-tab-label">{tab.label}</span>
                </button>
            ))}
        </div>
    );
}


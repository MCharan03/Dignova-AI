import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: 'default' | 'highlight' | 'hover-active';
}

export function GlassCard({ children, className = '', variant = 'default', ...props }: GlassCardProps) {
    let variantClass = '';
    if (variant === 'highlight') {
        variantClass = 'glass-card-highlight';
    } else if (variant === 'hover-active') {
        variantClass = 'glass-card-hover';
    }

    return (
        <div className={`glass-card ${variantClass} ${className}`} {...props}>
            {children}
        </div>
    );
}


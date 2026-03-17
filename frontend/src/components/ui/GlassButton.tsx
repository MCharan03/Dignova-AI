import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'icon' | 'danger';
}

export function GlassButton({ children, className = '', variant = 'primary', ...props }: GlassButtonProps) {
    return (
        <button className={`glass-btn glass-btn-${variant} ${className}`} {...props}>
            {children}
        </button>
    );
}


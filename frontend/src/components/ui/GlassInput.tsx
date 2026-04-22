import React from 'react';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode;
    endIcon?: React.ReactNode;
    onEndIconClick?: () => void;
}

export function GlassInput({ className = '', icon, endIcon, onEndIconClick, ...props }: GlassInputProps) {
    return (
        <div className={`glass-input-wrapper relative ${className}`}>
            {icon && <span className="glass-input-icon absolute left-4 top-1/2 -translate-y-1/2">{icon}</span>}
            <input className={`glass-input ${icon ? 'with-icon' : ''} ${endIcon ? 'pr-12' : ''}`} {...props} />
            {endIcon && (
                <span 
                    className={`absolute right-4 top-1/2 -translate-y-1/2 text-white/50 ${onEndIconClick ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                    onClick={onEndIconClick}
                >
                    {endIcon}
                </span>
            )}
        </div>
    );
}


import React from 'react';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode;
    endIcon?: React.ReactNode;
    onEndIconClick?: () => void;
    label?: string;
    isValid?: boolean;
    isInvalid?: boolean;
    errorText?: string;
}

export function GlassInput({ className = '', icon, endIcon, onEndIconClick, label, isValid, isInvalid, errorText, ...props }: GlassInputProps) {
    const statusClass = isValid ? 'border-emerald-500/50 bg-emerald-500/5' : isInvalid ? 'border-rose-500/50 bg-rose-500/5' : '';
    
    return (
        <div className={`glass-input-wrapper relative flex flex-col gap-1.5 ${className}`}>
            {label && <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest pl-1">{label}</label>}
            <div className="relative">
                {icon && <span className="glass-input-icon absolute left-4 top-1/2 -translate-y-1/2">{icon}</span>}
                <input 
                    className={`glass-input ${icon ? 'with-icon' : ''} ${endIcon ? 'pr-12' : ''} ${statusClass} w-full transition-all duration-300`} 
                    {...props} 
                />
                {endIcon && (
                    <span 
                        className={`absolute right-4 top-1/2 -translate-y-1/2 text-white/50 ${onEndIconClick ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                        onClick={onEndIconClick}
                    >
                        {endIcon}
                    </span>
                )}
            </div>
            {isInvalid && errorText && (
                <span className="text-[9px] font-mono text-rose-500/80 uppercase tracking-tighter pl-1 animate-pulse">
                    {errorText}
                </span>
            )}
        </div>
    );
}


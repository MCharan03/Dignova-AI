'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Settings, Shield, Cpu, Zap, Key, Save, Server, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { apiUrl } from '@/lib/api';

export default function AdminSettingsPage() {
    const [aiEnabled, setAiEnabled] = useState(true);
    const [loggingLevel, setLoggingLevel] = useState('verbose');
    const [confidenceThreshold, setConfidenceThreshold] = useState('medium');
    const [promptOverride, setPromptOverride] = useState('');

    // Security tab states
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [sessionTimeout, setSessionTimeout] = useState('1h');
    const [encryptionAlgorithm, setEncryptionAlgorithm] = useState('aes-256');
    const [auditLogging, setAuditLogging] = useState(true);

    // Node tab states
    const [maxNodes, setMaxNodes] = useState('50');
    const [dynamicScaling, setDynamicScaling] = useState(false);
    const [allocationStrategy, setAllocationStrategy] = useState('latency');
    const [primaryRegion, setPrimaryRegion] = useState('Global');

    // Aesthetics tab states
    const [themePreference, setThemePreference] = useState('sentient');
    const [holographicEffects, setHolographicEffects] = useState(true);
    const [animationSpeed, setAnimationSpeed] = useState('standard');
    const [fontOverride, setFontOverride] = useState('');

    // API tab states
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookRetry, setWebhookRetry] = useState('3');
    const [sandboxMode, setSandboxMode] = useState(true);
    const [apiVerbosity, setApiVerbosity] = useState('standard');

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('telemetry');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const res = await fetch(apiUrl('/api/settings'), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Failed to load settings');
                const data = await res.json().catch(() => ({}));

                // Telemetry
                setAiEnabled(data.ai_auto_triage === 'true');
                setConfidenceThreshold(data.confidence_threshold || 'medium');
                setPromptOverride(data.prompt_override || '');
                setLoggingLevel(data.logging_level || 'verbose');

                // Security
                setMfaEnabled(data.mfa_enabled === 'true');
                setSessionTimeout(data.session_timeout || '1h');
                setEncryptionAlgorithm(data.encryption_algorithm || 'aes-256');
                setAuditLogging(data.audit_logging !== 'false');

                // Nodes
                setMaxNodes(data.max_nodes || '50');
                setDynamicScaling(data.dynamic_scaling === 'true');
                setAllocationStrategy(data.allocation_strategy || 'latency');
                setPrimaryRegion(data.primary_region || 'Global');

                // Aesthetics
                setThemePreference(data.theme_preference || 'sentient');
                setHolographicEffects(data.holographic_effects !== 'false');
                setAnimationSpeed(data.animation_speed || 'standard');
                setFontOverride(data.font_override || '');

                // API
                setWebhookUrl(data.webhook_url || '');
                setWebhookRetry(data.webhook_retry || '3');
                setSandboxMode(data.sandbox_mode !== 'false');
                setApiVerbosity(data.api_verbosity || 'standard');

            } catch (err: any) {
                setMessage({ text: err.message, type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const token = localStorage.getItem('access_token');
            const payload = {
                ai_auto_triage: aiEnabled ? 'true' : 'false',
                confidence_threshold: confidenceThreshold,
                prompt_override: promptOverride,
                logging_level: loggingLevel,
                
                mfa_enabled: mfaEnabled ? 'true' : 'false',
                session_timeout: sessionTimeout,
                encryption_algorithm: encryptionAlgorithm,
                audit_logging: auditLogging ? 'true' : 'false',

                max_nodes: maxNodes,
                dynamic_scaling: dynamicScaling ? 'true' : 'false',
                allocation_strategy: allocationStrategy,
                primary_region: primaryRegion,

                theme_preference: themePreference,
                holographic_effects: holographicEffects ? 'true' : 'false',
                animation_speed: animationSpeed,
                font_override: fontOverride,

                webhook_url: webhookUrl,
                webhook_retry: webhookRetry,
                sandbox_mode: sandboxMode ? 'true' : 'false',
                api_verbosity: apiVerbosity
            };
            const res = await fetch(apiUrl('/api/settings'), {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to synchronize layer settings');
            setMessage({ text: 'System Config Synchronized Sequence Complete.', type: 'success' });
            setTimeout(() => setMessage(null), 4000);
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <p className="text-accent-cyan animate-pulse tracking-widest font-mono">Decrypting Node Settings...</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Settings className="text-accent-pink" />
                        System Overrides
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 border-l-2 border-accent-pink/50 pl-3">
                        Core configuration parameters for the Dignova Layer engine.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <AnimatePresence>
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono border ${message.type === 'success' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}
                            >
                                {message.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                {message.text}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2.5 rounded-xl bg-accent-pink/20 hover:bg-accent-pink/30 border border-accent-pink/50 text-white font-medium text-sm transition-all flex items-center gap-2 group shadow-[0_0_15px_rgba(236,72,153,0.3)] disabled:opacity-50"
                    >
                        <Save size={16} />
                        {saving ? 'Committing...' : 'Commit Changes'}
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-[250px_1fr] gap-8">
                {/* Sidebar Navigation */}
                <div className="space-y-2">
                    <button
                        onClick={() => setActiveTab('telemetry')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${activeTab === 'telemetry' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                    >
                        <Cpu className={activeTab === 'telemetry' ? 'text-accent-blue' : 'text-gray-500'} size={18} />
                        AI Telemetry
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${activeTab === 'security' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                    >
                        <Shield className={activeTab === 'security' ? 'text-success' : 'text-gray-500'} size={18} />
                        Security Protocols
                    </button>
                    <button
                        onClick={() => setActiveTab('nodes')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${activeTab === 'nodes' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                    >
                        <Server className={activeTab === 'nodes' ? 'text-warning' : 'text-gray-500'} size={18} />
                        Node Distribution
                    </button>
                    <button
                        onClick={() => setActiveTab('aesthetics')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${activeTab === 'aesthetics' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                    >
                        <Globe className={activeTab === 'aesthetics' ? 'text-accent-purple' : 'text-gray-500'} size={18} />
                        Interface Aesthetics
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors mt-auto pt-8 ${activeTab === 'api' ? 'bg-white/10 border border-white/20 text-white' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                    >
                        <Key className={activeTab === 'api' ? 'text-accent-pink' : 'text-gray-500'} size={18} />
                        API Integrations
                    </button>
                </div>

                {/* Settings Panel */}
                <div className="space-y-6">
                    {activeTab === 'telemetry' && (
                        <>
                            <GlassCard className="p-8">
                                <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-wider font-mono flex items-center gap-2">
                                    <Zap size={18} className="text-accent-cyan" />
                                    Autonomous Agent Controls
                                </h2>

                                <div className="space-y-8">
                                    {/* Toggle Setting */}
                                    <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                        <div>
                                            <h3 className="text-white font-medium">Asynchronous Auto-Triage</h3>
                                            <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                                Allows the AI agent to independently process background calls when nodes are idle. Disabling this requires manual doctor initiation for all simulations.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setAiEnabled(!aiEnabled)}
                                            className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${aiEnabled ? 'bg-accent-cyan' : 'bg-gray-700'}`}
                                        >
                                            <motion.div
                                                className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
                                                animate={{ x: aiEnabled ? 24 : 0 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        </button>
                                    </div>

                                    {/* Select Setting */}
                                    <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                        <div>
                                            <h3 className="text-white font-medium">Diagnostic Confidence Threshold</h3>
                                            <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                                The minimum certainty required for the AI to mark a case as 'ELEVATED' or 'CRITICAL' without secondary review.
                                            </p>
                                        </div>
                                        <select
                                            value={confidenceThreshold}
                                            onChange={(e) => setConfidenceThreshold(e.target.value)}
                                            className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-accent-cyan focus:outline-none"
                                        >
                                            <option value="high">Strict (&gt; 95%)</option>
                                            <option value="medium">Standard (&gt; 85%)</option>
                                            <option value="low">Aggressive (&gt; 70%)</option>
                                        </select>
                                    </div>

                                    {/* Input Setting */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 mr-8">
                                            <h3 className="text-white font-medium">System Role Prompt Override</h3>
                                            <p className="text-sm text-gray-400 mt-1">
                                                Inject custom base instructions directly into the LLM core. Leave blank to use default protocol.
                                            </p>
                                        </div>
                                        <input
                                            type="text"
                                            value={promptOverride}
                                            onChange={(e) => setPromptOverride(e.target.value)}
                                            placeholder="You are Dignova, a Sentient OS..."
                                            className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white w-64 focus:border-accent-cyan focus:outline-none placeholder:text-gray-600"
                                        />
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="p-8">
                                <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-wider font-mono">
                                    Kernel Logging
                                </h2>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-white font-medium">Telemetry Logging Level</h3>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Adjust verbosity of the background agent logs written to the database.
                                        </p>
                                    </div>
                                    <div className="flex bg-black/30 border border-white/10 rounded-lg p-1">
                                        <button
                                            onClick={() => setLoggingLevel('minimal')}
                                            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${loggingLevel === 'minimal' ? 'bg-white/20 text-white font-medium' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            Errors Only
                                        </button>
                                        <button
                                            onClick={() => setLoggingLevel('verbose')}
                                            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${loggingLevel === 'verbose' ? 'bg-white/20 text-white font-medium' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            Verbose
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        </>
                    )}

                    {activeTab === 'security' && (
                        <GlassCard className="p-8">
                            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-wider font-mono flex items-center gap-2">
                                <Shield size={18} className="text-success" />
                                Access & Security Settings
                            </h2>
                            <div className="space-y-8">
                                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-white font-medium">Require Multi-Factor Authentication</h3>
                                        <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                            Enforce MFA for all newly registered doctor and admin accounts connecting to the server.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setMfaEnabled(!mfaEnabled)}
                                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${mfaEnabled ? 'bg-success' : 'bg-gray-700'}`}
                                    >
                                        <motion.div
                                            className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
                                            animate={{ x: mfaEnabled ? 24 : 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-white font-medium">Session Idle Timeout</h3>
                                        <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                            Automatic logout period for inactive dashboard sessions to prevent unauthorized access.
                                        </p>
                                    </div>
                                    <select
                                        value={sessionTimeout}
                                        onChange={(e) => setSessionTimeout(e.target.value)}
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-success focus:outline-none"
                                    >
                                        <option value="15m">15 Minutes</option>
                                        <option value="1h">1 Hour</option>
                                        <option value="24h">24 Hours</option>
                                        <option value="never">Never (Not Recommended)</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-white font-medium">Kernel Encryption Standard</h3>
                                        <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                            Select the cryptographic primitive for data-at-rest within the Dignova database.
                                        </p>
                                    </div>
                                    <select
                                        value={encryptionAlgorithm}
                                        onChange={(e) => setEncryptionAlgorithm(e.target.value)}
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-success focus:outline-none"
                                    >
                                        <option value="aes-256">AES-256 (Standard)</option>
                                        <option value="cha-cha">ChaCha20 (High Perf)</option>
                                        <option value="quantum">Quantum-Resistant</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-white font-medium">Continuous Audit Logging</h3>
                                        <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                            Record every administrative action and security event to a tamper-proof ledger.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setAuditLogging(!auditLogging)}
                                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${auditLogging ? 'bg-success' : 'bg-gray-700'}`}
                                    >
                                        <motion.div
                                            className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
                                            animate={{ x: auditLogging ? 24 : 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    )}

                    {activeTab === 'nodes' && (
                        <GlassCard className="p-8">
                            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-wider font-mono flex items-center gap-2">
                                <Server size={18} className="text-warning" />
                                Physical Node Infrastructure
                            </h2>
                            <div className="space-y-8">
                                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-white font-medium">Max Concurrent Node Connections</h3>
                                        <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                            Throttle limit for how many doctors can stream WebSocket sessions concurrently.
                                        </p>
                                    </div>
                                    <select
                                        value={maxNodes}
                                        onChange={(e) => setMaxNodes(e.target.value)}
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-warning focus:outline-none"
                                    >
                                        <option value="50">50 Nodes</option>
                                        <option value="250">250 Nodes</option>
                                        <option value="1000">1000 Nodes (Enterprise)</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-white font-medium">Dynamic Resource Scaling</h3>
                                        <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                            Automatically provision virtual compute nodes during high-traffic emergency spikes.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setDynamicScaling(!dynamicScaling)}
                                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${dynamicScaling ? 'bg-warning' : 'bg-gray-700'}`}
                                    >
                                        <motion.div
                                            className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
                                            animate={{ x: dynamicScaling ? 24 : 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-white font-medium">Node Allocation Strategy</h3>
                                        <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                            Determines which server cluster handles incoming requests.
                                        </p>
                                    </div>
                                    <select
                                        value={allocationStrategy}
                                        onChange={(e) => setAllocationStrategy(e.target.value)}
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-warning focus:outline-none"
                                    >
                                        <option value="latency">Latency Optimized</option>
                                        <option value="cost">Cost Efficient</option>
                                        <option value="redundancy">High Availability</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex-1 mr-8">
                                        <h3 className="text-white font-medium">Primary Compute Region</h3>
                                        <p className="text-sm text-gray-400 mt-1">
                                            The physical datacenter where the core Dignova engine resides.
                                        </p>
                                    </div>
                                    <input
                                        type="text"
                                        value={primaryRegion}
                                        onChange={(e) => setPrimaryRegion(e.target.value)}
                                        placeholder="e.g. Global, US-East-1"
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white w-64 focus:border-warning focus:outline-none placeholder:text-gray-600"
                                    />
                                </div>
                            </div>
                        </GlassCard>
                    )}

                    {activeTab === 'aesthetics' && (
                        <GlassCard className="p-8">
                            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-wider font-mono flex items-center gap-2">
                                <Globe size={18} className="text-accent-purple" />
                                Aesthetic System
                            </h2>
                            <div className="space-y-8">
                                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-white font-medium">Global UI Master Theme</h3>
                                        <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                            Choose the core design philosophy for all authenticated dashboard surfaces.
                                        </p>
                                    </div>
                                    <select
                                        value={themePreference}
                                        onChange={(e) => setThemePreference(e.target.value)}
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-accent-purple focus:outline-none"
                                    >
                                        <option value="sentient">Sentient OS (Neon, Holographic)</option>
                                        <option value="medical_light">Clinical Light (Clean, Minimal)</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-white font-medium">Holographic Glass Overlays</h3>
                                        <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                            Enable advanced CSS backdrop-filter effects for a more immersive depth experience.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setHolographicEffects(!holographicEffects)}
                                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${holographicEffects ? 'bg-accent-purple' : 'bg-gray-700'}`}
                                    >
                                        <motion.div
                                            className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
                                            animate={{ x: holographicEffects ? 24 : 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-white font-medium">System Animation Velocity</h3>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Adjust the speed of Framer Motion transitions across the interface.
                                        </p>
                                    </div>
                                    <div className="flex bg-black/30 border border-white/10 rounded-lg p-1">
                                        {['slow', 'standard', 'fast'].map((speed) => (
                                            <button
                                                key={speed}
                                                onClick={() => setAnimationSpeed(speed)}
                                                className={`px-4 py-1.5 rounded-md text-xs uppercase tracking-tighter transition-colors ${animationSpeed === speed ? 'bg-accent-purple text-white font-bold' : 'text-gray-500 hover:text-white'}`}
                                            >
                                                {speed}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex-1 mr-8">
                                        <h3 className="text-white font-medium">Font Family Override</h3>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Input a Google Font name to override the default monospaced system font.
                                        </p>
                                    </div>
                                    <input
                                        type="text"
                                        value={fontOverride}
                                        onChange={(e) => setFontOverride(e.target.value)}
                                        placeholder="e.g. JetBrains Mono"
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white w-64 focus:border-accent-purple focus:outline-none placeholder:text-gray-600"
                                    />
                                </div>
                            </div>
                        </GlassCard>
                    )}

                    {activeTab === 'api' && (
                        <GlassCard className="p-8">
                            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-wider font-mono flex items-center gap-2">
                                <Key size={18} className="text-accent-pink" />
                                External Connectors
                            </h2>
                            <div className="space-y-8">
                                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                    <div className="flex-1 mr-8">
                                        <h3 className="text-white font-medium">Universal Event Webhook</h3>
                                        <p className="text-sm text-gray-400 mt-1">
                                            The destination API URL that will receive JSON payloads for system events.
                                        </p>
                                    </div>
                                    <input
                                        type="url"
                                        value={webhookUrl}
                                        onChange={(e) => setWebhookUrl(e.target.value)}
                                        placeholder="https://api.hospital.internal/hook"
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white w-72 focus:border-accent-pink focus:outline-none placeholder:text-gray-600"
                                    />
                                </div>

                                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-white font-medium">Webhook Retry Attempts</h3>
                                        <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                            Number of times the system will attempt to redeliver a failed webhook payload.
                                        </p>
                                    </div>
                                    <select
                                        value={webhookRetry}
                                        onChange={(e) => setWebhookRetry(e.target.value)}
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-accent-pink focus:outline-none"
                                    >
                                        <option value="1">1 Attempt</option>
                                        <option value="3">3 Attempts</option>
                                        <option value="5">5 Attempts</option>
                                        <option value="10">10 (Critical Only)</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-white font-medium">Developer Sandbox Mode</h3>
                                        <p className="text-sm text-gray-400 mt-1 max-w-lg">
                                            Redirect all external API traffic to a simulated mock environment for testing.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSandboxMode(!sandboxMode)}
                                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${sandboxMode ? 'bg-accent-pink' : 'bg-gray-700'}`}
                                    >
                                        <motion.div
                                            className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
                                            animate={{ x: sandboxMode ? 24 : 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-white font-medium">Integration Verbosity</h3>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Control the amount of metadata included in outgoing JSON payloads.
                                        </p>
                                    </div>
                                    <div className="flex bg-black/30 border border-white/10 rounded-lg p-1">
                                        {['minimal', 'standard', 'verbose'].map((v) => (
                                            <button
                                                key={v}
                                                onClick={() => setApiVerbosity(v)}
                                                className={`px-4 py-1.5 rounded-md text-xs uppercase tracking-tighter transition-colors ${apiVerbosity === v ? 'bg-accent-pink text-white font-bold' : 'text-gray-500 hover:text-white'}`}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    )}
                </div>
            </div>
        </div>
    );
}


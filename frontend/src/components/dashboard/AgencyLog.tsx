'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Terminal, Shield, Activity, Database, Cpu, Plus, CheckCircle2, AlertCircle, Eye } from 'lucide-react';

interface AgencyTask {
    id: number;
    title: string;
    description: string;
    status: string;
    progress: number;
    result_summary: string;
    created_at: string;
}

export default function AgencyLog() {
    const [activeTab, setActiveTab] = useState<'events' | 'tasks'>('events');
    const [logs, setLogs] = useState<any[]>([]);
    const [tasks, setTasks] = useState<AgencyTask[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [selectedTask, setSelectedTask] = useState<AgencyTask | null>(null);
    const [loadingTasks, setLoadingTasks] = useState(false);

    const logContainerRef = useRef<HTMLDivElement>(null);

    // Fetch Events via SSE
    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const eventSource = new EventSource(`${apiUrl}/api/agency/stream`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setLogs(prev => {
                    const updated = [...prev, data];
                    if (updated.length > 8) return updated.slice(-8);
                    return updated;
                });
                
                // If a background task updates, refresh tasks list
                if (data.type === 'system_healing' && data.message.includes('background agent')) {
                    fetchTasks();
                }
            } catch (err) {
                console.error("SSE Parse Error:", err);
            }
        };

        eventSource.onerror = (err) => {
            console.error("SSE Connection Error:", err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, []);

    // Fetch Tasks from API
    const fetchTasks = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        try {
            const res = await fetch('/api/agency/tasks', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (err) {
            console.error('Failed to fetch agency tasks:', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'tasks') {
            fetchTasks();
        }
    }, [activeTab]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            const res = await fetch('/api/agency/tasks/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newTaskTitle,
                    description: newTaskDesc
                })
            });

            if (res.ok) {
                setNewTaskTitle('');
                setNewTaskDesc('');
                fetchTasks();
            }
        } catch (err) {
            console.error('Failed to queue agency task:', err);
        }
    };

    return (
        <GlassCard className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
                        <Terminal className="text-accent-blue" size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Agency Activity</h3>
                        <div className="flex gap-2 mt-1">
                            <button 
                                onClick={() => setActiveTab('events')}
                                className={`text-[9px] font-mono uppercase tracking-widest ${activeTab === 'events' ? 'text-accent-cyan font-bold' : 'text-gray-500 hover:text-white'}`}
                            >
                                [Events]
                            </button>
                            <button 
                                onClick={() => setActiveTab('tasks')}
                                className={`text-[9px] font-mono uppercase tracking-widest ${activeTab === 'tasks' ? 'text-accent-cyan font-bold' : 'text-gray-500 hover:text-white'}`}
                            >
                                [Ghost Agents]
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
                    <span className="text-[8px] font-mono text-gray-500 uppercase tracking-tighter">OS_CORE_ACTIVE</span>
                </div>
            </div>

            {/* TAB 1: Events Log (Terminal) */}
            {activeTab === 'events' && (
                <div className="flex-1 bg-black/60 rounded-xl border border-white/5 p-4 font-mono overflow-hidden relative min-h-[220px]">
                    <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/60 to-transparent z-10" />
                    <div className="space-y-3" ref={logContainerRef}>
                        <AnimatePresence mode="popLayout">
                            {logs.map((log) => (
                                <motion.div 
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10, filter: 'blur(5px)' }}
                                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5 }}
                                    className="flex gap-3 items-start group"
                                >
                                    <span className="text-[8px] text-accent-blue/40 mt-1">
                                        [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                                    </span>
                                    <div className="flex flex-col gap-0.5">
                                        <span className={`text-[7px] uppercase font-black tracking-widest ${
                                            log.type === 'system_healing' ? 'text-emerald-400' :
                                            log.type === 'telemetry' ? 'text-accent-cyan' :
                                            log.type === 'security_audit' ? 'text-rose-400' :
                                            'text-accent-blue'
                                        }`}>
                                            {log.type.replace('_', ' ')}
                                        </span>
                                        <p className="text-[10px] text-gray-400 leading-tight group-hover:text-white transition-colors">
                                            {log.message}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/60 to-transparent z-10" />
                </div>
            )}

            {/* TAB 2: Ghost Agents Panel */}
            {activeTab === 'tasks' && (
                <div className="flex-1 flex flex-col gap-3 min-h-[220px]">
                    {/* Task Creation Form */}
                    <form onSubmit={handleCreateTask} className="flex flex-col gap-2 p-2 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="Agent Goal (e.g. Audit Node 4)"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-accent-cyan/60"
                            />
                            <button 
                                type="submit"
                                className="px-3 py-1 rounded-lg bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan text-xs font-mono hover:bg-accent-cyan/35 flex items-center gap-1"
                            >
                                <Plus size={12} /> Launch
                            </button>
                        </div>
                        <input 
                            type="text"
                            placeholder="Detailed instructions/parameters..."
                            value={newTaskDesc}
                            onChange={(e) => setNewTaskDesc(e.target.value)}
                            className="bg-transparent text-[10px] text-white/60 font-mono focus:outline-none px-1"
                        />
                    </form>

                    {/* Task Progress List */}
                    <div className="flex-1 overflow-y-auto max-h-[160px] space-y-2 pr-1 custom-scrollbar">
                        {tasks.map(task => (
                            <div key={task.id} className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {task.status === 'completed' && <CheckCircle2 size={12} className="text-emerald-400" />}
                                        {task.status === 'failed' && <AlertCircle size={12} className="text-rose-400" />}
                                        {task.status === 'running' && <Cpu size={12} className="text-accent-cyan animate-spin" />}
                                        {task.status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
                                        <span className="text-[10px] font-bold text-white font-mono truncate max-w-[140px]">{task.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-mono text-gray-500 uppercase">{task.status}</span>
                                        {task.result_summary && (
                                            <button 
                                                onClick={() => setSelectedTask(task)}
                                                className="p-0.5 rounded bg-white/5 text-accent-cyan hover:bg-white/10"
                                            >
                                                <Eye size={10} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-500 ${
                                            task.status === 'completed' ? 'bg-emerald-400' :
                                            task.status === 'failed' ? 'bg-rose-400' :
                                            'bg-accent-cyan'
                                        }`}
                                        style={{ width: `${task.progress}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Expansions Modal for Task Summary */}
            <AnimatePresence>
                {selectedTask && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-md"
                        >
                            <GlassCard className="p-5 border-accent-cyan/30">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                                    <span className="text-xs font-black font-mono text-accent-cyan uppercase tracking-widest">AGENT REPORT: {selectedTask.title}</span>
                                    <button 
                                        onClick={() => setSelectedTask(null)}
                                        className="text-gray-500 hover:text-white font-mono text-xs"
                                    >
                                        [CLOSE]
                                    </button>
                                </div>
                                <div className="bg-black/60 rounded-xl border border-white/5 p-4 font-mono text-[10px] text-gray-300 whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto">
                                    {selectedTask.result_summary}
                                </div>
                            </GlassCard>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="mt-4 flex gap-4">
                <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                    <Database size={12} className="text-gray-500" />
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-accent-blue" 
                            animate={{ width: ["20%", "45%", "30%"] }} 
                            transition={{ duration: 4, repeat: Infinity }}
                        />
                    </div>
                    <span className="text-[8px] font-mono text-gray-500">I/O</span>
                </div>
                <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                    <Activity size={12} className="text-gray-500" />
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-accent-cyan" 
                            animate={{ width: ["60%", "85%", "70%"] }} 
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </div>
                    <span className="text-[8px] font-mono text-gray-500">CPU</span>
                </div>
            </div>
        </GlassCard>
    );
}

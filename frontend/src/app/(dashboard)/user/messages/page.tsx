'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SplitText } from '@/components/ui/SentientMotion';
import {
    MessageCircle, Send, Search, Users, Circle, ChevronRight,
    ArrowLeft, Paperclip, Star, Clock, CheckCheck, Bot
} from 'lucide-react';

interface Conversation {
    id: number; other_user_id: number; other_user_name: string;
    other_user_role: string; last_message: string;
    last_message_at: string; unread_count: number;
    is_online: boolean;
}

interface Message {
    id: number; sender_id: number; content: string;
    created_at: string; is_read: boolean;
    sender_name: string; sender_role: string;
}

export default function MessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

    const fetchConversations = useCallback(async () => {
        try {
            const res = await fetch('/api/messages/conversations', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setConversations(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => {
        // Get current user id
        try {
            const t = token;
            if (t) {
                const payload = JSON.parse(atob(t.split('.')[1]));
                setCurrentUserId(payload.user_id || payload.sub);
            }
        } catch {}
        fetchConversations();
    }, [fetchConversations, token]);

    const loadMessages = async (convo: Conversation) => {
        setActiveConvo(convo);
        try {
            const res = await fetch(`/api/messages/${convo.other_user_id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                setMessages(await res.json());
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        } catch (err) { console.error(err); }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !activeConvo) return;
        try {
            const res = await fetch(`/api/messages/${activeConvo.other_user_id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newMessage })
            });
            if (res.ok) {
                setNewMessage('');
                loadMessages(activeConvo);
                fetchConversations();
            }
        } catch (err) { console.error(err); }
    };

    const filteredConvos = conversations.filter(c =>
        c.other_user_name.toLowerCase().includes(search.toLowerCase())
    );

    const roleColor = (role: string) => {
        switch (role) {
            case 'doctor': return 'text-accent-blue bg-accent-blue/10 border-accent-blue/30';
            case 'org_admin': return 'text-accent-purple bg-accent-purple/10 border-accent-purple/30';
            case 'super_admin': return 'text-danger bg-danger/10 border-danger/30';
            default: return 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/30';
        }
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 60000) return 'Now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex gap-0 h-[calc(100vh-100px)] animate-in fade-in duration-500">
            {/* Sidebar — Conversation List */}
            <GlassCard className={`${activeConvo ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 shrink-0 !rounded-r-none border-r-0 border-white/5 overflow-hidden`}>
                <div className="p-4 border-b border-white/5">
                    <SplitText text="MESSAGES" className="text-lg font-black text-white tracking-[0.15em]" />
                    <div className="mt-3 relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..."
                            className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-accent-cyan/30 transition-all font-mono" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" /></div>
                    ) : filteredConvos.length === 0 ? (
                        <div className="py-12 text-center">
                            <MessageCircle size={32} className="text-gray-700 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No conversations yet</p>
                        </div>
                    ) : (
                        filteredConvos.map((c) => (
                            <motion.div key={c.id} whileHover={{ x: 4 }}
                                onClick={() => loadMessages(c)}
                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-white/5 transition-all ${activeConvo?.id === c.id ? 'bg-accent-cyan/5 border-l-2 border-l-accent-cyan' : 'hover:bg-white/[0.02]'}`}>
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-blue/30 to-accent-purple/30 flex items-center justify-center border border-white/10 text-white font-bold text-sm">
                                        {c.other_user_name.charAt(0).toUpperCase()}
                                    </div>
                                    {c.is_online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-[#0a0a0f] shadow-[0_0_5px_#10b981]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white truncate">{c.other_user_name}</span>
                                        <span className="text-[8px] font-mono text-gray-600 shrink-0">{formatTime(c.last_message_at)}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <p className="text-[10px] text-gray-500 truncate">{c.last_message}</p>
                                        {c.unread_count > 0 && (
                                            <span className="ml-1 w-4 h-4 rounded-full bg-accent-cyan flex items-center justify-center text-[8px] font-black text-black shrink-0">{c.unread_count}</span>
                                        )}
                                    </div>
                                    <span className={`inline-block mt-1 text-[7px] font-mono uppercase px-1.5 py-0.5 rounded border ${roleColor(c.other_user_role)}`}>{c.other_user_role}</span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </GlassCard>

            {/* Chat Area */}
            <GlassCard className={`${activeConvo ? 'flex' : 'hidden md:flex'} flex-col flex-1 !rounded-l-none border-white/5 overflow-hidden`}>
                {!activeConvo ? (
                    <div className="flex-1 flex items-center justify-center flex-col gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-accent-cyan/5 border border-accent-cyan/10 flex items-center justify-center">
                            <MessageCircle size={32} className="text-accent-cyan/40" />
                        </div>
                        <p className="text-sm text-gray-500">Select a conversation to start</p>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="flex items-center gap-3 p-4 border-b border-white/5">
                            <button onClick={() => setActiveConvo(null)} className="md:hidden p-1.5 rounded-lg hover:bg-white/5 transition-all">
                                <ArrowLeft size={16} className="text-gray-400" />
                            </button>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue/30 to-accent-purple/30 flex items-center justify-center border border-white/10 text-white font-bold text-sm">
                                {activeConvo.other_user_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <span className="text-sm font-bold text-white">{activeConvo.other_user_name}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[7px] font-mono uppercase px-1.5 py-0.5 rounded border ${roleColor(activeConvo.other_user_role)}`}>{activeConvo.other_user_role}</span>
                                    {activeConvo.is_online && <span className="text-[8px] font-mono text-success flex items-center gap-1"><Circle size={5} fill="currentColor" /> Online</span>}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((m, i) => {
                                const isMine = m.sender_id === currentUserId;
                                return (
                                    <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.01 }}
                                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isMine ? 'bg-accent-cyan/20 border border-accent-cyan/30 rounded-br-sm' : 'bg-white/5 border border-white/10 rounded-bl-sm'}`}>
                                            {!isMine && <p className="text-[8px] font-mono text-accent-blue mb-1">{m.sender_name}</p>}
                                            <p className="text-sm text-white leading-relaxed">{m.content}</p>
                                            <div className="flex items-center justify-end gap-1.5 mt-1">
                                                <span className="text-[8px] font-mono text-gray-600">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {isMine && m.is_read && <CheckCheck size={10} className="text-accent-cyan" />}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                    placeholder="Type a message..." 
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-cyan/30 transition-all" />
                                <button onClick={sendMessage} disabled={!newMessage.trim()} 
                                    className="p-3 rounded-xl bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </GlassCard>
        </div>
    );
}

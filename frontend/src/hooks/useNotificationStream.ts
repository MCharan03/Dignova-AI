'use client';
import { useEffect, useRef, useCallback } from 'react';

interface NotificationPayload {
    type: string;
    [key: string]: any;
}

interface UseNotificationStreamOptions {
    onNotification?: (payload: NotificationPayload) => void;
    onConnect?: () => void;
    onCountUpdate?: (count: number) => void;
}

export function useNotificationStream({
    onNotification,
    onConnect,
    onCountUpdate,
}: UseNotificationStreamOptions = {}) {
    const esRef = useRef<EventSource | null>(null);
    const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectDelay = useRef(2000);

    const connect = useCallback(() => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        // Close existing connection
        esRef.current?.close();

        const es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);
        esRef.current = es;

        es.onopen = () => {
            reconnectDelay.current = 2000; // reset backoff
            onConnect?.();
        };

        es.onmessage = (event) => {
            try {
                const payload: NotificationPayload = JSON.parse(event.data);
                if (payload.type === 'heartbeat') return;
                if (payload.type === 'connected') return;

                onNotification?.(payload);

                // Refresh unread count after any notification
                fetch('/api/notifications/count', {
                    headers: { Authorization: `Bearer ${token}` }
                }).then(r => r.ok ? r.json() : null).then(d => {
                    if (d?.unread_count !== undefined) onCountUpdate?.(d.unread_count);
                }).catch(() => {});
            } catch {}
        };

        es.onerror = () => {
            es.close();
            esRef.current = null;
            // Exponential backoff reconnect
            reconnectRef.current = setTimeout(() => {
                reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 30000);
                connect();
            }, reconnectDelay.current);
        };
    }, [onNotification, onConnect, onCountUpdate]);

    useEffect(() => {
        connect();
        return () => {
            esRef.current?.close();
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
        };
    }, [connect]);

    return {
        disconnect: () => esRef.current?.close(),
    };
}

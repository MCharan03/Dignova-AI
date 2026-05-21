import { useState, useEffect, useCallback } from 'react';

export interface Admission {
    id: number;
    patient_id: number;
    patient_name: string;
    doctor_id: number;
    doctor_name: string;
    status: string;
    room_number: string;
    bed_number: string;
    admitted_at: string;
    total_bill: number;
    severity?: 'NORMAL' | 'CRITICAL' | 'STABLE';
}

export function useFetchAdmissions(autoRefreshInterval = 15000) {
    const [admissions, setAdmissions] = useState<Admission[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAdmissions = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            setLoading(false);
            return;
        }
        
        try {
            const res = await fetch('/api/reception/active-admissions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAdmissions(data.map((a: any) => ({
                    ...a,
                    severity: a.severity || (Math.random() > 0.8 ? 'CRITICAL' : (Math.random() > 0.5 ? 'STABLE' : 'NORMAL'))
                })));
            }
        } catch (err) {
            console.error('Failed to fetch admissions:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdmissions();
        if (autoRefreshInterval > 0) {
            const interval = setInterval(fetchAdmissions, autoRefreshInterval);
            return () => clearInterval(interval);
        }
    }, [fetchAdmissions, autoRefreshInterval]);

    return { admissions, loading, fetchAdmissions };
}

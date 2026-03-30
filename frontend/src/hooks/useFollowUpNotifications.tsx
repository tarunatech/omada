import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { isSameDay, parseISO } from 'date-fns';
import { Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { api } from '@/lib/api';

export interface FollowUpAlert {
    id: string;
    clientName: string;
    dept: string;
    notes: string;
    date: string;
}

export const useFollowUpNotifications = () => {
    const [dueToday, setDueToday] = useState<FollowUpAlert[]>([]);
    const [lastToastTime, setLastToastTime] = useState(0);
    const location = useLocation();

    const checkFollowUps = useCallback(async (showToasts = false) => {
        try {
            const res = await api.get('/sales?limit=1000');
            const records = res.data || [];
            if (!records || !Array.isArray(records)) {
                setDueToday([]);
                return [];
            }

            const today = new Date();
            const alerts: FollowUpAlert[] = [];

            records.forEach((record: any) => {
                if (record.followUps) {
                    record.followUps.forEach((fu: any) => {
                        // Backend date might be ISO string or YYYY-MM-DD
                        const fuDate = parseISO(fu.date);
                        if (isSameDay(fuDate, today)) {
                            alerts.push({
                                id: `${record.id}-${fu.date}`,
                                clientName: record.siteName || record.firmName || record.contractorOwnerName || 'Client',
                                dept: record.dept,
                                notes: fu.notes,
                                date: fu.date
                            });
                        }
                    });
                }
            });

            // Sorting alerts by dept
            alerts.sort((a, b) => a.dept.localeCompare(b.dept));

            setDueToday(prev => {
                const isSame = prev.length === alerts.length &&
                    prev.every((a, i) => a.id === alerts[i].id);
                return isSame ? prev : alerts;
            });

            const now = Date.now();
            if (showToasts && alerts.length > 0 && (now - lastToastTime > 600000)) { // 10 mins debounce for toasts
                alerts.forEach((notif, index) => {
                    setTimeout(() => {
                        toast(`Follow-up Due Today!`, {
                            description: `${notif.clientName} [${notif.dept.toUpperCase()}] - ${notif.notes}`,
                            icon: <Bell className="w-4 h-4 text-emerald-500" />,
                            duration: 8000,
                        });
                    }, index * 500);
                });
                setLastToastTime(now);
            }

            return alerts;
        } catch (e) {
            console.error("Error checking follow-ups:", e);
            return [];
        }
    }, [lastToastTime]);

    useEffect(() => {
        checkFollowUps(true);
    }, [location.pathname, checkFollowUps]);

    useEffect(() => {
        const interval = setInterval(() => checkFollowUps(false), 60000); // Check every 1 min
        return () => clearInterval(interval);
    }, [checkFollowUps]);

    return { dueToday, refresh: () => checkFollowUps(false) };
};

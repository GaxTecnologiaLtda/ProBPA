import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Components';
import { useAuth } from '../../context/AuthContext';
import { subscribeToNotifications, markAllAsRead, Notification, markAsRead } from '../../services/notificationsService';
import { Bell, UserPlus, Info, AlertTriangle, Check, Calendar, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationsPage: React.FC = () => {
    const { claims } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!claims?.entityId) return;

        // Subscribe to ALL (or a larger limit) - Service might need adjustment if 50 is too low
        // For now, using the existing subscribe which returns latest 50. 
        // Ideally, we'd have a separate infinite scroll fetch, but for V1 this works.
        const unsubscribe = subscribeToNotifications(claims.entityId, (data) => {
            setNotifications(data);
        });

        return () => unsubscribe();
    }, [claims?.entityId]);

    const handleMarkAllRead = async () => {
        if (claims?.entityId) {
            await markAllAsRead(claims.entityId);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        if (claims?.entityId) {
            await markAsRead(claims.entityId, id);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'NEW_PROFESSIONAL': return <UserPlus className="w-5 h-5 text-emerald-600" />;
            case 'ALERT': return <AlertTriangle className="w-5 h-5 text-amber-600" />;
            default: return <Info className="w-5 h-5 text-blue-600" />;
        }
    };

    // Grouping Logic
    const groupedNotifications = (() => {
        const filtered = notifications.filter(n =>
            n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.message.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Sort handled by Firestore query (desc), but good to be safe if client-side filtering affects it
        // filtered.sort((a, b) => ...) 

        const groups: { [key: string]: Notification[] } = {};

        filtered.forEach(notification => {
            if (!notification.createdAt) return;

            let date: Date;
            if (notification.createdAt.seconds) {
                date = new Date(notification.createdAt.seconds * 1000);
            } else {
                // Fallback for safety
                return;
            }

            // Group by full date: "09 de fevereiro de 2026"
            const dateKey = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            // Capitalize first letter
            const formattedDate = dateKey.charAt(0).toUpperCase() + dateKey.slice(1);

            if (!groups[formattedDate]) {
                groups[formattedDate] = [];
            }
            groups[formattedDate].push(notification);
        });

        return groups;
    })();

    return (
        <div className="p-8 max-w-5xl mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="w-6 h-6 text-emerald-600" />
                        Central de Notificações
                    </h1>
                    <p className="text-gray-500 mt-1">Histórico de alertas e atividades da entidade.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar notificações..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm w-full md:w-64"
                        />
                    </div>
                    {notifications.some(n => !n.read) && (
                        <button
                            onClick={handleMarkAllRead}
                            className="bg-white dark:bg-gray-800 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all hover:shadow"
                        >
                            <Check className="w-4 h-4" />
                            Marcar todas como lidas
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-8">
                {Object.keys(groupedNotifications).length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhuma notificação encontrada</h3>
                        <p className="text-gray-500">Você não possui notificações recentes.</p>
                    </div>
                ) : (
                    Object.entries(groupedNotifications).map(([month, items]) => (
                        <div key={month} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2 sticky top-0 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm p-2 z-10 rounded-lg">
                                <Calendar className="w-5 h-5 text-emerald-500" />
                                {month}
                            </h2>

                            <div className="grid gap-3">
                                {items.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => !notification.read && handleMarkAsRead(notification.id!)}
                                        className={`group relative bg-white dark:bg-gray-800 p-4 rounded-xl border transition-all duration-200 ${!notification.read
                                            ? 'border-emerald-200 dark:border-emerald-900/50 shadow-md ring-1 ring-emerald-500/20'
                                            : 'border-gray-100 dark:border-gray-700 hover:border-emerald-200 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`p-3 rounded-full h-fit shrink-0 ${!notification.read ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                                                {getIcon(notification.type)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className={`font-semibold text-base mb-1 ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            {notification.title}
                                                        </h3>
                                                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                                            {notification.message}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-400 whitespace-nowrap ml-4">
                                                        {notification.createdAt?.seconds
                                                            ? new Date(notification.createdAt.seconds * 1000).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                            : 'Agora'
                                                        }
                                                    </span>
                                                </div>

                                                {/* Optional: Add Action Buttons here later if needed */}
                                            </div>

                                            {!notification.read && (
                                                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;

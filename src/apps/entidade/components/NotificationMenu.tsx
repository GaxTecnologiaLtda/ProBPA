import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, UserPlus, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToNotifications, markAsRead, markAllAsRead, Notification } from '../services/notificationsService';

const NotificationMenu: React.FC = () => {
    const { claims } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const previousCountRef = useRef<number>(0);

    useEffect(() => {
        if (!claims?.entityId) return;

        const unsubscribe = subscribeToNotifications(claims.entityId, (data) => {
            setNotifications(data);
            previousCountRef.current = data.length;
        });

        return () => unsubscribe();
    }, [claims?.entityId]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (claims?.entityId) {
            await markAsRead(claims.entityId, id);
        }
    };

    const handleMarkAllRead = async () => {
        if (claims?.entityId) {
            await markAllAsRead(claims.entityId);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read && claims?.entityId) {
            await markAsRead(claims.entityId, notification.id!);
        }

        if (notification.type === 'NEW_PROFESSIONAL') {
            navigate('/privado/profissionais');
            setIsOpen(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'NEW_PROFESSIONAL': return <UserPlus className="w-4 h-4 text-emerald-600" />;
            case 'ALERT': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
            default: return <Info className="w-4 h-4 text-blue-600" />;
        }
    };

    // Grouping Logic for Dropdown
    const groupedNotifications = (() => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups: { [key: string]: Notification[] } = {
            'Hoje': [],
            'Ontem': [],
            'Antigas': []
        };

        notifications.forEach(notification => {
            if (!notification.createdAt) return;
            const date = new Date(notification.createdAt.seconds * 1000); // Firestore timestamp

            if (date.toDateString() === today.toDateString()) {
                groups['Hoje'].push(notification);
            } else if (date.toDateString() === yesterday.toDateString()) {
                groups['Ontem'].push(notification);
            } else {
                groups['Antigas'].push(notification);
            }
        });

        // Remove empty groups
        return Object.entries(groups).filter(([_, items]) => items.length > 0);
    })();

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 relative transition-colors"
                title="Notificações"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800 animate-pulse" />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 origin-top-right flex flex-col max-h-[calc(100vh-100px)]"
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 shrink-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notificações</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium flex items-center gap-1"
                                >
                                    <Check className="w-3 h-3" /> Marcar todas como lidas
                                </button>
                            )}
                        </div>

                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Nenhuma notificação recente.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {groupedNotifications.map(([label, items]) => (
                                        <div key={label}>
                                            <div className="px-4 py-2 bg-gray-50/50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-0 backdrop-blur-sm z-10">
                                                {label}
                                            </div>
                                            <ul>
                                                {items.map((notification) => (
                                                    <li
                                                        key={notification.id}
                                                        onClick={() => handleNotificationClick(notification)}
                                                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${!notification.read ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}
                                                    >
                                                        <div className="flex gap-3">
                                                            <div className={`mt-1 p-1.5 rounded-full shrink-0 ${!notification.read ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-transparent'}`}>
                                                                {getIcon(notification.type)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start mb-0.5">
                                                                    <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                                        {notification.title}
                                                                    </h4>
                                                                    {!notification.read && (
                                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                                                                    )}
                                                                </div>
                                                                <p className={`text-xs leading-relaxed ${!notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}`}>
                                                                    {notification.message}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                                                    {notification.createdAt?.seconds
                                                                        ? new Date(notification.createdAt.seconds * 1000).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                                                        : 'Agora'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 shrink-0 text-center">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/privado/notificacoes');
                                }}
                                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                                Ver todas as notificações
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationMenu;

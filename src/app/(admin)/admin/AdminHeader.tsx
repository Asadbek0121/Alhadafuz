
"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Bell, X, Check } from 'lucide-react';
import Link from 'next/link';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}

export default function AdminHeader() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/admin/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await fetch('/api/admin/notifications', {
            method: 'POST',
            body: JSON.stringify({ id, action: 'mark_read' })
        });
    };

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);

        await fetch('/api/admin/notifications', {
            method: 'POST',
            body: JSON.stringify({ action: 'mark_all_read' })
        });
    };

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="fixed top-0 right-0 h-[70px] bg-white/80 backdrop-blur-md z-[90] flex items-center justify-end px-8 border-b border-gray-100 transition-all duration-300 left-[270px]">

            <div className="flex items-center gap-6" ref={dropdownRef}>
                {/* Bell Icon */}
                <div
                    className="relative cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Bell size={22} color="#5A6A85" className={`transition-transform ${isOpen ? 'scale-110 text-blue-600' : ''}`} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white ring-2 ring-white font-bold animate-pulse">
                            {unreadCount}
                        </span>
                    )}

                    {/* Dropdown */}
                    {isOpen && (
                        <div className="absolute top-10 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/50">
                                <h3 className="font-semibold text-gray-700 text-sm">Bildirishnomalar</h3>
                                {unreadCount > 0 && (
                                    <button onClick={(e) => { e.stopPropagation(); markAllRead(); }} className="text-[10px] text-blue-600 hover:underline font-medium">
                                        O'qilgan deb belgilash
                                    </button>
                                )}
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        Yangi xabarlar yo'q
                                    </div>
                                ) : (
                                    notifications.map(item => (
                                        <div
                                            key={item.id}
                                            className={`p-4 border-b last:border-0 hover:bg-gray-50 transition-colors cursor-default ${!item.isRead ? 'bg-blue-50/30' : ''}`}
                                            onClick={() => !item.isRead && markAsRead(item.id)}
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <p className={`text-xs font-semibold ${item.type === 'ORDER' ? 'text-blue-600' : item.type === 'USER' ? 'text-green-600' : 'text-orange-600'}`}>
                                                    {item.title}
                                                </p>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className={`text-sm mt-1 leading-snug ${!item.isRead ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                                {item.message}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-2 border-t bg-gray-50 font-medium text-center text-xs text-gray-500">
                                Barcha tarixni ko'rish
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div className="w-[35px] h-[35px] rounded-full overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow">
                    <img src="https://ui-avatars.com/api/?name=Admin&background=0085db&color=fff" className="w-full h-full object-cover" />
                </div>
            </div>
        </header>
    );
}

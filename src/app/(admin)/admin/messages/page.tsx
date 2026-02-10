"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, User, Clock, CheckCheck, Search, MoreVertical, Phone, Paperclip, Smile } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { uz, ru, enUS } from "date-fns/locale";

interface Message {
    id: string;
    content: string;
    createdAt: string;
    isRead: boolean;
    senderId: string;
    receiverId: string;
    sender: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
    };
    receiver: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
    };
}

interface Conversation {
    userId: string;
    userName: string;
    userContact: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
}

export default function AdminMessagesPage() {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState("");
    const queryClient = useQueryClient();

    // Fetch all conversations
    const { data: conversations = [], isLoading: loadingConversations } = useQuery<Conversation[]>({
        queryKey: ['admin-conversations'],
        queryFn: async () => {
            const res = await fetch('/api/admin/messages/conversations');
            if (!res.ok) throw new Error('Failed to fetch conversations');
            return res.json();
        },
        refetchInterval: 5000,
    });

    // Fetch messages for selected user
    const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
        queryKey: ['admin-messages', selectedUserId],
        queryFn: async () => {
            if (!selectedUserId) return [];
            console.log("Fetching messages for user:", selectedUserId);
            const res = await fetch(`/api/admin/messages/${selectedUserId}`);
            if (!res.ok) {
                console.error("Failed to fetch messages:", res.status, res.statusText);
                throw new Error('Failed to fetch messages');
            }
            const data = await res.json();
            return data;
        },
        enabled: !!selectedUserId,
        refetchInterval: 3000,
    });

    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await fetch('/api/admin/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUserId, content }),
            });
            if (!res.ok) throw new Error('Failed to send message');
            return res.json();
        },
        onSuccess: () => {
            setMessageText("");
            queryClient.invalidateQueries({ queryKey: ['admin-messages', selectedUserId] });
            queryClient.invalidateQueries({ queryKey: ['admin-conversations'] });
        },
        onError: () => {
            toast.error("Xabar yuborishda xatolik");
        },
    });

    const handleSendMessage = () => {
        if (!messageText.trim() || !selectedUserId) return;
        sendMessageMutation.mutate(messageText);
    };

    const getLocale = () => {
        const locale = 'uz';
        return locale === 'uz' ? uz : locale === 'ru' ? ru : enUS;
    };

    const selectedConversation = conversations.find(c => c.userId === selectedUserId);

    return (
        <div className="h-[calc(100vh-2rem)] flex bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-2xl shadow-gray-200/50 m-4">
            {/* Sidebar */}
            <div className="w-96 bg-gray-50/50 border-r border-gray-100 flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
                            <MessageSquare size={24} strokeWidth={2.5} />
                        </div>
                        Xabarlar
                    </h1>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            placeholder="Qidirish..."
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                    {loadingConversations ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                            <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
                            <span className="text-xs font-medium">Yuklanmoqda...</span>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                            <MessageSquare className="opacity-20" size={40} />
                            <span className="text-sm font-medium">Suhbatlar yo'q</span>
                        </div>
                    ) : (
                        conversations.map((conv) => {
                            const idToUse = conv.userId || (conv as any).id;
                            const isActive = selectedUserId === idToUse;

                            return (
                                <button
                                    key={idToUse}
                                    onClick={() => setSelectedUserId(idToUse)}
                                    className={`w-full p-4 rounded-2xl transition-all duration-200 flex gap-4 text-left group ${isActive
                                            ? 'bg-blue-600 shadow-lg shadow-blue-500/30'
                                            : 'hover:bg-white hover:shadow-md hover:shadow-gray-200/50'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600'
                                        }`}>
                                        {conv.userName?.[0]?.toUpperCase() || <User size={20} />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`font-bold truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>
                                                {conv.userName}
                                            </span>
                                            <span className={`text-[10px] font-medium ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {formatDistanceToNow(new Date(conv.lastMessageTime), {
                                                    addSuffix: false,
                                                    locale: getLocale(),
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-sm truncate ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                                                {conv.lastMessage}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <span className={`h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${isActive
                                                        ? 'bg-white text-blue-600'
                                                        : 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                                                    }`}>
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col bg-white relative">
                {selectedUserId ? (
                    <>
                        {/* Header */}
                        <div className="h-20 px-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold">
                                    {selectedConversation?.userName?.[0]?.toUpperCase() || <User size={20} />}
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900 leading-tight">
                                        {selectedConversation?.userName}
                                    </h2>
                                    <p className="text-xs font-medium text-gray-400 flex items-center gap-1">
                                        {selectedConversation?.userContact}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-blue-600 transition-colors">
                                    <Phone size={20} />
                                </button>
                                <button className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-blue-600 transition-colors">
                                    <MoreVertical size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-[0.98]">
                            {loadingMessages ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                    <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                                    <MessageSquare size={64} strokeWidth={1} className="mb-4 text-gray-300" />
                                    <p className="font-medium">Xabarlar tarixi bo'sh</p>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isAdmin = msg.sender.email?.includes('admin') || msg.senderId !== selectedUserId;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`flex flex-col max-w-[70%] ${isAdmin ? 'items-end' : 'items-start'}`}>
                                                <div
                                                    className={`rounded-2xl px-5 py-3 shadow-sm relative group transition-all ${isAdmin
                                                            ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-500/20'
                                                            : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-gray-200/50'
                                                        }`}
                                                >
                                                    {(msg.content.includes('blob.vercel-storage.com') && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.content)) || (msg as any).type === 'IMAGE' ? (
                                                        <img
                                                            src={msg.content}
                                                            alt="Chat media"
                                                            className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity mb-1"
                                                            onClick={() => window.open(msg.content, '_blank')}
                                                        />
                                                    ) : (msg.content.includes('blob.vercel-storage.com') && /\.(webm|ogg|mp3|wav|mp4)$/i.test(msg.content)) || (msg as any).type === 'AUDIO' ? (
                                                        <div className="min-w-[240px] bg-white/10 rounded-lg p-1">
                                                            <audio controls className="w-full h-10 accent-white" preload="metadata">
                                                                <source src={msg.content} />
                                                                Browser doesn't support audio.
                                                            </audio>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                    )}

                                                    <div className={`text-[10px] font-medium mt-1 flex items-center justify-end gap-1 opacity-70 ${isAdmin ? 'text-blue-100' : 'text-gray-400'
                                                        }`}>
                                                        {formatDistanceToNow(new Date(msg.createdAt), {
                                                            addSuffix: true,
                                                            locale: getLocale(),
                                                        })}
                                                        {isAdmin && msg.isRead && (
                                                            <CheckCheck size={12} strokeWidth={3} />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-100">
                            <div className="bg-gray-50 flex items-center p-2 rounded-[24px] border border-gray-100 shadow-inner focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50 transition-all">
                                <button className="p-3 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-white/50">
                                    <Paperclip size={20} />
                                </button>
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Xabar yozing..."
                                    className="flex-1 bg-transparent px-4 py-2 focus:outline-none text-gray-900 placeholder:text-gray-400 font-medium"
                                />
                                <button className="p-3 text-gray-400 hover:text-orange-500 transition-colors rounded-full hover:bg-white/50 mr-2">
                                    <Smile size={20} />
                                </button>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                                    className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center"
                                >
                                    <Send size={18} strokeWidth={2.5} className={messageText.trim() ? "translate-x-0.5" : ""} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
                        <div className="w-32 h-32 rounded-full bg-blue-50 flex items-center justify-center mb-6 animate-pulse">
                            <MessageSquare size={64} className="text-blue-200" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">Suhbatni tanlang</h3>
                        <p className="text-gray-500 font-medium text-center max-w-xs">
                            Foydalanuvchilar bilan yozishmalarni ko'rish uchun chap tomondan suhbatni tanlang
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

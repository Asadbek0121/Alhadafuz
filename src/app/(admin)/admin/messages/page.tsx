"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, User, Clock, CheckCheck } from "lucide-react";
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
        refetchInterval: 5000, // Refresh every 5 seconds
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
            console.log("Messages API response:", data);
            return data;
        },
        enabled: !!selectedUserId,
        refetchInterval: 3000, // Refresh every 3 seconds
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
        const locale = 'uz'; // You can get this from context
        return locale === 'uz' ? uz : locale === 'ru' ? ru : enUS;
    };

    const selectedConversation = conversations.find(c => c.userId === selectedUserId);

    return (
        <div className="h-[calc(100vh-4rem)] flex bg-gray-50">
            {/* Conversations List */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-6 h-6" />
                        Xabarlar
                    </h1>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingConversations ? (
                        <div className="p-4 text-center text-gray-500">Yuklanmoqda...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            Hozircha xabarlar yo'q
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                key={conv.userId || (conv as any).id}
                                onClick={() => {
                                    const idToUse = conv.userId || (conv as any).id;
                                    console.log("Button Clicked! Setting ID:", idToUse);
                                    console.log("Conversation Object:", conv);
                                    setSelectedUserId(idToUse);
                                }}
                                className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${selectedUserId === (conv.userId || (conv as any).id) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span className="font-semibold text-gray-900">{conv.userName}</span>
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 truncate mb-1">{conv.lastMessage}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(conv.lastMessageTime), {
                                        addSuffix: true,
                                        locale: getLocale(),
                                    })}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
                {selectedUserId ? (
                    <>
                        {/* Header */}
                        <div className="p-4 bg-white border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <User className="w-5 h-5 text-gray-400" />
                                <div>
                                    <h2 className="font-semibold text-gray-900">
                                        {selectedConversation?.userName}
                                    </h2>
                                    <p className="text-sm text-gray-500">{selectedConversation?.userContact}</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loadingMessages ? (
                                <div className="text-center text-gray-500">Yuklanmoqda...</div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-gray-500">Xabarlar yo'q</div>
                            ) : (
                                messages.map((msg) => {
                                    const isAdmin = msg.sender.email?.includes('admin') || msg.senderId !== selectedUserId;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-md ${isAdmin
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white border border-gray-200 text-gray-900'
                                                    } overflow-hidden rounded-2xl`}
                                            >
                                                <div className={(msg.content.includes('blob.vercel-storage.com') || (msg as any).type === 'IMAGE' || (msg as any).type === 'AUDIO') ? 'p-1' : 'px-4 py-2'}>
                                                    {(msg.content.includes('blob.vercel-storage.com') && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.content)) || (msg as any).type === 'IMAGE' ? (
                                                        <img
                                                            src={msg.content}
                                                            alt="Chat media"
                                                            className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                                                            onClick={() => window.open(msg.content, '_blank')}
                                                        />
                                                    ) : (msg.content.includes('blob.vercel-storage.com') && /\.(webm|ogg|mp3|wav|mp4)$/i.test(msg.content)) || (msg as any).type === 'AUDIO' ? (
                                                        <div className="min-w-[200px]">
                                                            <audio controls className="w-full h-10" preload="metadata">
                                                                <source src={msg.content} />
                                                                Browser doesn't support audio.
                                                            </audio>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm">{msg.content}</p>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-1 p-2 pt-0 text-[10px] ${isAdmin ? 'text-blue-100' : 'text-gray-400'
                                                    }`}>
                                                    {formatDistanceToNow(new Date(msg.createdAt), {
                                                        addSuffix: true,
                                                        locale: getLocale(),
                                                    })}
                                                    {isAdmin && msg.isRead && (
                                                        <CheckCheck className="w-3 h-3 ml-1" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-white border-t border-gray-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Xabar yozing..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Send className="w-4 h-4" />
                                    Yuborish
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>Suhbatni tanlang</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

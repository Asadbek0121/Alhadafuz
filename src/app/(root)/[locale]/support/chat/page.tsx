"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, MessageSquare, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { useUserStore } from "@/store/useUserStore";
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
    };
}

export default function SupportChatPage() {
    const [messageText, setMessageText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const t = useTranslations('Support');
    const router = useRouter();
    const { user, isAuthenticated, openAuthModal } = useUserStore();

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            openAuthModal();
            router.push('/');
        }
    }, [isAuthenticated, openAuthModal, router]);

    // Fetch messages
    const { data: messages = [], isLoading } = useQuery<Message[]>({
        queryKey: ['support-messages'],
        queryFn: async () => {
            const res = await fetch('/api/chat/support');
            if (!res.ok) throw new Error('Failed to fetch messages');
            return res.json();
        },
        enabled: isAuthenticated,
        refetchInterval: 3000, // Auto-refresh every 3 seconds
    });

    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await fetch('/api/chat/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            if (!res.ok) throw new Error('Failed to send message');
            return res.json();
        },
        onSuccess: () => {
            setMessageText("");
            queryClient.invalidateQueries({ queryKey: ['support-messages'] });
            scrollToBottom();
        },
        onError: () => {
            toast.error(t('send_error') || "Xabar yuborishda xatolik");
        },
    });

    const handleSendMessage = () => {
        if (!messageText.trim()) return;
        sendMessageMutation.mutate(messageText);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getLocale = () => {
        const locale = 'uz'; // Get from context if needed
        return locale === 'uz' ? uz : locale === 'ru' ? ru : enUS;
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-white rounded-lg shadow-lg my-4">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <MessageSquare className="w-6 h-6 text-blue-500" />
                <div>
                    <h1 className="text-lg font-bold text-gray-900">
                        {t('chat_title') || 'Yordam xizmati'}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {t('chat_subtitle') || 'Savollaringizga javob beramiz'}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {isLoading ? (
                    <div className="text-center text-gray-500 py-8">
                        {t('loading') || 'Yuklanmoqda...'}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>{t('no_messages') || 'Hozircha xabarlar yo\'q'}</p>
                        <p className="text-sm mt-2">
                            {t('start_chat') || 'Birinchi xabaringizni yuboring'}
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isUser = msg.senderId === user?.id;
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-md px-4 py-3 rounded-2xl ${isUser
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                                        }`}
                                >
                                    {!isUser && (
                                        <p className="text-xs font-semibold mb-1 opacity-70">
                                            {t('support_team') || 'Yordam xizmati'}
                                        </p>
                                    )}
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                    <p className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-400'
                                        }`}>
                                        {formatDistanceToNow(new Date(msg.createdAt), {
                                            addSuffix: true,
                                            locale: getLocale(),
                                        })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={t('type_message') || "Xabar yozing..."}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={sendMessageMutation.isPending}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sendMessageMutation.isPending}
                        className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                        <Send className="w-5 h-5" />
                        <span className="hidden sm:inline">
                            {t('send') || 'Yuborish'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

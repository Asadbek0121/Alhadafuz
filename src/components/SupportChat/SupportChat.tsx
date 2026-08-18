"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquareText, X, Send, User, Loader2, ChevronLeft, HelpCircle, Headset, ChevronRight, MessageSquare, Check, CheckCheck, Image as ImageIcon, Paperclip, Mic, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

type Message = {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
    isRead?: boolean;
    type?: 'TEXT' | 'IMAGE' | 'AUDIO';
};

type ViewState = 'menu' | 'chat';

import { useChatStore } from '@/store/useChatStore';

export default function SupportChat() {
    const t = useTranslations('Chat');
    const { data: session } = useSession();
    const router = useRouter();
    const { isOpen, view, openChat, openMenu, closeChat, toggleChat } = useChatStore();
    const [admin, setAdmin] = useState<{ id: string, name: string, image: string } | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [supportAnimationData, setSupportAnimationData] = useState(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetch('https://lottie.host/37c09846-80d2-4b2e-ba16-eeb292525d27/g8BUGOhwGd.json')
            .then(res => res.json())
            .then(data => setSupportAnimationData(data))
            .catch(() => {});
    }, []);

    // Fetch Admin Contact on Mount
    useEffect(() => {
        fetch('/api/chat/support-contact')
            .then(res => {
                const contentType = res.headers.get("content-type");
                if (res.ok && contentType && contentType.includes("application/json")) {
                    return res.json();
                }
                return null;
            })
            .then(data => {
                if (data && !data.error) setAdmin(data);
            })
            .catch(err => {
                // Silently fail - admin contact is optional
                console.log('Admin contact not available');
            });
    }, []);

    const fetchMessages = useCallback(() => {
        fetch(`/api/chat/support`)
            .then(res => {
                const contentType = res.headers.get("content-type");
                if (res.ok && contentType && contentType.includes("application/json")) {
                    return res.json();
                }
                return null;
            })
            .then(data => {
                if (data && Array.isArray(data)) {
                    setMessages(data);
                    setLoading(false);
                }
            })
            .catch(() => setLoading(false));
    }, []);

    // Fetch Messages when in chat view
    useEffect(() => {
        if (isOpen && view === 'chat' && session?.user) {
            setLoading(true);
            fetchMessages();
            const interval = setInterval(fetchMessages, 3000); // Poll every 3s
            return () => clearInterval(interval);
        }
    }, [isOpen, view, session, fetchMessages]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Formatni aniqlash
            const mimeType = MediaRecorder.isTypeSupported('audio/mp4')
                ? 'audio/mp4'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/ogg';

            const recorder = new MediaRecorder(stream, { mimeType });
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = async () => {
                if (chunks.length === 0) {
                    toast.error(t('voice_empty'));
                    return;
                }
                const blob = new Blob(chunks, { type: mimeType });
                let extension = 'webm';
                if (mimeType.includes('mp4')) extension = 'mp4';
                else if (mimeType.includes('ogg')) extension = 'ogg';
                else if (mimeType.includes('wav')) extension = 'wav';
                else if (mimeType.includes('aac')) extension = 'm4a';

                await handleVoiceUpload(blob, extension);
                stream.getTracks().forEach(track => {
                    track.stop();
                    console.log(`Track ${track.label} stopped`);
                });
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            toast.error(t('error_mic'));
            console.error('Recording Error:', err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleVoiceUpload = async (blob: Blob, extension: string) => {
        if (!session) return;
        const formData = new FormData();
        formData.append('file', blob, `voice.${extension}`);

        try {
            setLoading(true);
            console.log(`Uploading voice: size=${blob.size}, type=${blob.type}, extension=${extension}`);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: "Server hatosi" }));
                toast.error(`${t('error_voice')}: ${errorData.error || res.statusText}`);
                return;
            }

            const data = await res.json();

            if (data.url) {
                console.log("Upload successful, saving to chat:", data.url);
                const saveRes = await fetch('/api/chat/support', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: data.url,
                        type: 'AUDIO'
                    })
                });

                if (!saveRes.ok) {
                    toast.error(t('error_send'));
                }
                fetchMessages();
            }
        } catch (error) {
            toast.error(t('error_voice'));
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !session) return;

        if (!file.type.startsWith('image/')) {
            toast.error(t('only_images'));
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            setLoading(true);
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: "Server hatosi" }));
                toast.error(`${t('error_image')}: ${errorData.error || res.statusText}`);
                return;
            }

            const data = await res.json();

            if (data.url) {
                const saveRes = await fetch('/api/chat/support', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: data.url,
                        type: 'IMAGE'
                    })
                });

                if (!saveRes.ok) {
                    toast.error(t('error_send'));
                }
                fetchMessages();
            }
        } catch (error) {
            toast.error(t('error_image'));
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !session) return;

        const optimisticMsg: Message = {
            id: Date.now().toString(),
            senderId: session.user.id || 'me',
            content: inputValue,
            createdAt: new Date().toISOString(),
            type: 'TEXT'
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setInputValue("");

        try {
            await fetch('/api/chat/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: optimisticMsg.content,
                    type: 'TEXT'
                })
            });
            fetchMessages(); // Refresh messages
        } catch (error) {
            toast.error(t('error_send'));
        }
    };

    const handleStartChat = () => {
        if (session) {
            openChat();
        } else {
            toast.info(t('login_required'));
            router.push('/?auth=login');
        }
    };

    const toggleOpen = () => {
        toggleChat();
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(40px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .support-fab {
                    position: fixed !important;
                    bottom: 25px !important;
                    right: 25px !important;
                    width: 56px;
                    height: 56px;
                    border-radius: 20px;
                    background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
                    color: #fff;
                    border: none;
                    box-shadow: 0 10px 30px rgba(37, 99, 235, 0.4);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .support-fab-lottie {
                    position: fixed !important;
                    bottom: 25px !important;
                    right: 25px !important;
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: #fff;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    padding: 0;
                    border: none;
                    overflow: hidden;
                }

                .support-fab:hover, .support-fab-lottie:hover {
                    transform: translateY(-5px) scale(1.05);
                    box-shadow: 0 15px 35px rgba(37, 99, 235, 0.5);
                }

                .support-window {
                    animation: slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
                }

                /* Below lg (1024px): BottomNav is visible — lift FAB above it */
                @media (max-width: 1023px) {
                    .support-fab, .support-fab-lottie {
                        bottom: 100px !important;
                    }
                }

                @media (max-width: 480px) {
                    .support-window {
                        bottom: 0 !important;
                        right: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        max-height: 100% !important;
                        border-radius: 0 !important;
                    }
                    .support-fab, .support-fab-lottie {
                        bottom: 100px !important;
                        right: 20px !important;
                    }
                }
                `
            }} />

            {/* FAB */}
            <button
                onClick={toggleOpen}
                className={supportAnimationData ? "support-fab-lottie" : "support-fab"}
                style={{ transform: isOpen ? 'rotate(90deg) scale(0)' : 'rotate(0) scale(1)' }}
                aria-label={isOpen ? t('close_chat') || "Chatni yopish" : t('open_chat') || "Chatni ochish"}
            >
                {supportAnimationData ? (
                    <Lottie animationData={supportAnimationData} loop autoplay style={{ width: '100%', height: '100%' }} />
                ) : (
                    <Headset size={28} strokeWidth={2.5} />
                )}
            </button>

            {/* Window */}
            {isOpen && (
                <div className="support-window fixed bottom-[100px] right-[25px] w-[320px] h-[460px] max-h-[calc(100vh-140px)] bg-white rounded-[24px] shadow-2xl flex flex-col z-[9999] overflow-hidden border border-slate-100 origin-bottom-right animate-slide-up">
                    {/* Header - Modern Redesign */}
                    <div className="support-header p-3 px-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white flex justify-between items-center min-h-[64px] z-10">
                        <div className="flex items-center gap-2.5 flex-1">
                            {view === 'chat' && (
                                <button 
                                    onClick={openMenu} 
                                    className="bg-white/15 border-none text-white cursor-pointer p-1.5 flex rounded-lg backdrop-blur-sm"
                                    aria-label={t('back') || "Orqaga"}
                                >
                                    <ChevronLeft size={20} strokeWidth={3} />
                                </button>
                            )}

                            <div className="support-avatar w-[38px] h-[38px] rounded-xl overflow-hidden border-[1.5px] border-white/30 bg-white">
                                {supportAnimationData ? (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                                        <Lottie animationData={supportAnimationData} loop autoplay style={{ width: '130%', height: '130%' }} />
                                    </div>
                                ) : view === 'menu' ? (
                                    <img src="/logo.png" alt="Hadaf Logo" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                        <Headset size={20} className="text-blue-600" strokeWidth={2.5} />
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0">
                                <h4 className="m-0 text-[15px] font-black text-white tracking-tight leading-tight truncate">
                                    {view === 'menu' ? t('title') : (t('operator') || "Operator")}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80] animate-pulse"></span>
                                    <span className="text-[10px] text-white/80 font-extrabold uppercase tracking-wider">{t('online')}</span>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={closeChat} 
                            className="bg-white/15 border-none rounded-lg w-7 h-7 text-white cursor-pointer flex items-center justify-center backdrop-blur-sm active-scale"
                            aria-label={t('close') || "Yopish"}
                        >
                            <X size={16} strokeWidth={3} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col bg-white">
                        {view === 'menu' ? (
                            <div className="support-menu-content p-5 flex-1 flex flex-col bg-white">
                                <div className="text-center mb-5 mt-1">
                                    <h3 className="text-base font-black text-slate-900 mb-1.5 tracking-tight welcome-title">{t('welcome')}</h3>
                                    <p className="text-slate-500 text-[12px] leading-relaxed font-semibold welcome-desc px-4">
                                        {t('subtitle') || "Savollaringiz bormi? Bizga yozing"}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-2.5">
                                    <button onClick={handleStartChat} className="support-menu-item flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 cursor-pointer transition-all menu-item-hover active-scale">
                                        <div className="support-icon-box w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600">
                                            <MessageSquareText size={20} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="font-extrabold text-slate-800 text-[13px] tracking-tight">{t('live_chat')}</div>
                                            <div className="text-[10px] text-slate-400 font-semibold">{t('live_chat_desc') || "Jonli muloqot"}</div>
                                        </div>
                                        <ChevronRight size={14} className="opacity-30" strokeWidth={3} />
                                    </button>

                                    <a href="https://t.me/Hadaf_supportbot" target="_blank" rel="noopener noreferrer" className="support-menu-item flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 cursor-pointer transition-all no-underline menu-item-hover active-scale">
                                        <div className="support-icon-box w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
                                            <Send size={20} strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="font-extrabold text-slate-800 text-[13px] tracking-tight">{t('telegram_bot')}</div>
                                            <div className="text-[10px] text-slate-400 font-semibold">{t('telegram_bot_desc') || "Telegram orqali"}</div>
                                        </div>
                                        <ChevronRight size={14} className="opacity-30" strokeWidth={3} />
                                    </a>
                                </div>
                                <div className="mt-auto text-center pb-2.5">
                                    <p className="text-[9px] font-extrabold text-slate-300 uppercase tracking-widest">Hadaf Market Support</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Chat Area - Styled like previous premium chat */}
                                <div ref={scrollRef} className="flex-1 bg-slate-50/50 p-3.5 overflow-y-auto">
                                    {loading && messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <div className="w-5 h-5 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-300 text-center px-8">
                                            <div className="w-14 h-14 bg-white rounded-[18px] flex items-center justify-center mb-3 shadow-sm border border-slate-100">
                                                <MessageSquare size={24} strokeWidth={2.5} />
                                            </div>
                                            <h4 className="m-0 text-slate-800 text-[13px] font-black">{t('no_messages') || "Xabarlar yo'q"}</h4>
                                            <p className="text-[10px] font-semibold text-slate-400">{t('no_messages_desc') || "Savolingizni yo'llang"}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2.5">
                                            {messages.map(msg => {
                                                const isMe = msg.senderId === session?.user?.id;
                                                return (
                                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                        <div className={`max-w-[85%] ${
                                                            (msg.type === 'IMAGE' || msg.type === 'AUDIO' || msg.content.includes('blob.vercel-storage.com')) ? 'p-1' : 'p-2 px-3'
                                                        } ${
                                                            isMe ? 'rounded-[14px_14px_2px_14px] bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'rounded-[14px_14px_14px_2px] bg-white text-slate-900 border border-slate-100 shadow-sm'
                                                        } text-[11px] leading-relaxed font-bold break-words`}>
                                                            {msg.type === 'IMAGE' || (msg.content.includes('blob.vercel-storage.com') && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.content)) ? (
                                                                <img
                                                                    src={msg.content}
                                                                    alt="Chat image"
                                                                    className="w-full rounded-lg block cursor-pointer"
                                                                    onClick={() => window.open(msg.content, '_blank')}
                                                                />
                                                            ) : msg.type === 'AUDIO' || (msg.content.includes('blob.vercel-storage.com') && /\.(webm|ogg|mp3|wav|mp4)$/i.test(msg.content)) ? (
                                                                <div className="min-w-[180px] p-1">
                                                                    <audio controls className="w-full h-8" preload="metadata">
                                                                        <source src={msg.content} />
                                                                    </audio>
                                                                </div>
                                                            ) : (
                                                                msg.content
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-1 px-1">
                                                            <span className="text-[7px] text-slate-300 font-black uppercase">
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {isMe && (
                                                                msg.isRead ? <CheckCheck size={10} className="text-emerald-400" strokeWidth={3} /> : <Check size={10} className="text-slate-300" strokeWidth={3} />
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Input - Ultra Compact and Premium */}
                                <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100">
                                    <div className="flex items-center gap-1.5 relative">
                                        {isRecording ? (
                                            <div className="flex-1 flex items-center justify-between p-1.5 px-3 bg-red-50 rounded-xl border border-red-100">
                                                <div className="flex items-center gap-2 text-red-500">
                                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                                    <span className="font-black text-[13px]">{formatTime(recordingTime)}</span>
                                                </div>
                                                <button type="button" onClick={stopRecording} className="text-blue-600 font-black bg-transparent border-none cursor-pointer text-[11px] uppercase">
                                                    {t('stop_and_send') || "Yuborish"}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-100 p-0 px-1">
                                                <label className="cursor-pointer text-slate-400 p-1.5 hover:text-blue-600 transition-colors">
                                                    <Paperclip size={16} strokeWidth={2.5} />
                                                    <input type="file" accept="image/*" aria-label="Rasm yuborish" onChange={handleImageUpload} className="hidden" />
                                                </label>
                                                <input
                                                    placeholder={t('input_placeholder') || "Xabar..."}
                                                    value={inputValue}
                                                    onChange={e => setInputValue(e.target.value)}
                                                    className="flex-1 p-2.5 text-[12px] bg-transparent border-none outline-none text-slate-900 font-bold placeholder:text-slate-400"
                                                    aria-label="Xabar matni"
                                                />
                                                {!inputValue.trim() ? (
                                                    <button 
                                                        type="button" 
                                                        onClick={startRecording} 
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border-none transition-all m-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                        aria-label="Ovozli xabar yozishni boshlash"
                                                    >
                                                        <Mic size={16} strokeWidth={2.5} />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        type="submit" 
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer border-none transition-all m-1 bg-blue-600 text-white hover:bg-blue-700"
                                                        aria-label="Xabarni yuborish"
                                                    >
                                                        <Send size={15} strokeWidth={3} className="ml-0.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

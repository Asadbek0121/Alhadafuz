"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquareText, X, Send, User, Loader2, ChevronLeft, HelpCircle, Headset, ChevronRight, MessageSquare, Check, CheckCheck, Image as ImageIcon, Paperclip, Mic, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

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
    const scrollRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

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
                @keyframes pulse-ring {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(1.3); opacity: 0; }
                }

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

                .support-fab::before {
                    content: '';
                    position: absolute;
                    inset: -4px;
                    background: inherit;
                    border-radius: inherit;
                    z-index: -1;
                    opacity: 0.4;
                    animation: pulse-ring 2s infinite;
                }

                .menu-item-hover:hover {
                    background-color: #f8fafc;
                    transform: translateX(4px);
                    border-color: #2563eb33;
                }
                
                .active-scale:active {
                    transform: scale(0.96);
                }

                @media (max-width: 768px) {
                    .support-fab {
                        width: 50px !important;
                        height: 50px !important;
                        bottom: 90px !important;
                        right: 16px !important;
                        border-radius: 16px !important;
                    }
                    .support-fab svg {
                        width: 24px !important;
                        height: 24px !important;
                    }
                    .support-window {
                        width: calc(100vw - 32px) !important;
                        max-width: 320px !important;
                        height: 480px !important;
                        bottom: 150px !important;
                        right: 16px !important;
                        border-radius: 24px !important;
                        border: 1px solid rgba(255,255,255,0.8) !important;
                    }
                    .support-header {
                        padding: 12px 14px !important;
                        min-height: 56px !important;
                    }
                    .support-header h4 {
                        font-size: 13px !important;
                    }
                    .support-avatar {
                        width: 34px !important;
                        height: 34px !important;
                        border-radius: 10px !important;
                    }
                    .support-menu-content {
                        padding: 16px !important;
                    }
                    .support-menu-item {
                        padding: 10px !important;
                        gap: 10px !important;
                        border-radius: 14px !important;
                    }
                    .support-icon-box {
                        width: 36px !important;
                        height: 36px !important;
                        border-radius: 10px !important;
                    }
                    .support-icon-box svg {
                        width: 18px !important;
                        height: 18px !important;
                    }
                    .welcome-title {
                        font-size: 14px !important;
                    }
                    .welcome-desc {
                        font-size: 11px !important;
                    }
                }
                `
            }} />
            {/* FAB */}
            <button
                onClick={toggleOpen}
                className="support-fab"
                style={{ transform: isOpen ? 'rotate(90deg) scale(0)' : 'rotate(0) scale(1)' }}
            >
                <Headset size={28} strokeWidth={2.5} />
            </button>

            {/* Window */}
            {isOpen && (
                <div style={styles.container} className="support-window">
                    {/* Header - Modern Redesign */}
                    <div style={styles.header} className="support-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            {view === 'chat' && (
                                <button onClick={openMenu} style={styles.headerBackBtn}>
                                    <ChevronLeft size={20} strokeWidth={3} />
                                </button>
                            )}

                            <div style={styles.avatarContainer} className="support-avatar">
                                {view === 'menu' ? (
                                    <img src="/logo.png" alt="Hadaf Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                                        <Headset size={20} color="#2563eb" strokeWidth={2.5} />
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0">
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', lineHeight: '1.2' }} className="truncate">
                                    {view === 'menu' ? t('title') : (t('operator') || "Operator")}
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', animation: 'pulse 2s infinite' }}></span>
                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('online')}</span>
                                </div>
                            </div>
                        </div>

                        <button onClick={closeChat} style={styles.headerCloseBtn} className="active-scale">
                            <X size={16} strokeWidth={3} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        {view === 'menu' ? (
                            <div style={styles.menuContent} className="support-menu-content">
                                <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '4px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginBottom: '6px', letterSpacing: '-0.2px' }} className="welcome-title">{t('welcome')}</h3>
                                    <p style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.4', fontWeight: 600 }} className="welcome-desc px-4">
                                        {t('subtitle') || "Savollaringiz bormi? Bizga yozing"}
                                    </p>
                                </div>

                                <div style={styles.menuOptions}>
                                    <button onClick={handleStartChat} style={styles.menuItem} className="menu-item-hover active-scale support-menu-item">
                                        <div style={{ ...styles.iconBox, background: '#eff6ff', color: '#2563eb' }} className="support-icon-box">
                                            <MessageSquareText size={20} strokeWidth={2.5} />
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px', letterSpacing: '-0.1px' }}>{t('live_chat')}</div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{t('live_chat_desc') || "Jonli muloqot"}</div>
                                        </div>
                                        <ChevronRight size={14} className="opacity-30" strokeWidth={3} />
                                    </button>

                                    <a href="https://t.me/Hadaf_supportbot" target="_blank" rel="noopener noreferrer" style={{ ...styles.menuItem, textDecoration: 'none' }} className="menu-item-hover active-scale support-menu-item">
                                        <div style={{ ...styles.iconBox, background: '#f0fdf4', color: '#16a34a' }} className="support-icon-box">
                                            <Send size={20} strokeWidth={2.5} />
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '13px', letterSpacing: '-0.1px' }}>{t('telegram_bot')}</div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{t('telegram_bot_desc') || "Telegram orqali"}</div>
                                        </div>
                                        <ChevronRight size={14} className="opacity-30" strokeWidth={3} />
                                    </a>
                                </div>
                                <div style={{ marginTop: 'auto', textAlign: 'center', paddingBottom: '10px' }}>
                                    <p style={{ fontSize: '9px', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '1px' }}>Hadaf Market Support</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Chat Area - Styled like previous premium chat */}
                                <div ref={scrollRef} style={styles.messagesArea}>
                                    {loading && messages.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <div className="w-5 h-5 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#cbd5e1', textAlign: 'center', padding: '0 30px' }}>
                                            <div style={{ width: '56px', height: '56px', background: '#fff', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                                                <MessageSquare size={24} strokeWidth={2.5} />
                                            </div>
                                            <h4 style={{ margin: '0 0 4px 0', color: '#1e293b', fontSize: '13px', fontWeight: 900 }}>{t('no_messages') || "Xabarlar yo'q"}</h4>
                                            <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8' }}>{t('no_messages_desc') || "Savolingizni yo'llang"}</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {messages.map(msg => {
                                                const isMe = msg.senderId === session?.user?.id;
                                                return (
                                                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                                        <div style={{
                                                            maxWidth: '85%',
                                                            padding: (msg.type === 'IMAGE' || msg.type === 'AUDIO' || msg.content.includes('blob.vercel-storage.com')) ? '4px' : '8px 13px',
                                                            borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                                            background: isMe ? '#2563eb' : '#fff',
                                                            color: isMe ? '#fff' : '#0f172a',
                                                            fontSize: '11px',
                                                            lineHeight: '1.4',
                                                            fontWeight: 700,
                                                            wordBreak: 'break-word',
                                                            boxShadow: isMe ? '0 4px 12px rgba(37, 99, 235, 0.15)' : '0 2px 5px rgba(0,0,0,0.03)',
                                                            border: isMe ? 'none' : '1px solid #f1f5f9',
                                                        }}>
                                                            {msg.type === 'IMAGE' || (msg.content.includes('blob.vercel-storage.com') && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.content)) ? (
                                                                <img
                                                                    src={msg.content}
                                                                    alt="Chat image"
                                                                    style={{ width: '100%', borderRadius: '10px', display: 'block' }}
                                                                    onClick={() => window.open(msg.content, '_blank')}
                                                                />
                                                            ) : msg.type === 'AUDIO' || (msg.content.includes('blob.vercel-storage.com') && /\.(webm|ogg|mp3|wav|mp4)$/i.test(msg.content)) ? (
                                                                <div style={{ minWidth: '180px', padding: '4px' }}>
                                                                    <audio controls style={{ width: '100%', height: '32px' }} preload="metadata">
                                                                        <source src={msg.content} />
                                                                    </audio>
                                                                </div>
                                                            ) : (
                                                                msg.content
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px', padding: '0 4px' }}>
                                                            <span style={{ fontSize: '7px', color: '#cbd5e1', fontWeight: 800, textTransform: 'uppercase' }}>
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {isMe && (
                                                                msg.isRead ? <CheckCheck size={10} color="#4ade80" strokeWidth={3} /> : <Check size={10} color="#cbd5e1" strokeWidth={3} />
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Input - Ultra Compact and Premium */}
                                <form onSubmit={handleSend} style={styles.inputArea}>
                                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {isRecording ? (
                                            <div style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '6px 12px',
                                                background: '#fef2f2',
                                                borderRadius: '12px',
                                                border: '1px solid #fee2e2'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                                    <span style={{ fontWeight: 900, fontSize: '13px' }}>{formatTime(recordingTime)}</span>
                                                </div>
                                                <button type="button" onClick={stopRecording} style={{ color: '#2563eb', fontWeight: 900, background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', textTransform: 'uppercase' }}>
                                                    {t('stop_and_send') || "Yuborish"}
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', padding: '0 4px' }}>
                                                <label style={{ cursor: 'pointer', color: '#94a3b8', padding: '6px' }}>
                                                    <Paperclip size={16} strokeWidth={2.5} />
                                                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                                </label>
                                                <input
                                                    placeholder={t('input_placeholder') || "Xabar..."}
                                                    value={inputValue}
                                                    onChange={e => setInputValue(e.target.value)}
                                                    style={styles.input}
                                                />
                                                {!inputValue.trim() ? (
                                                    <button type="button" onClick={startRecording} style={{ ...styles.actionBtn, background: '#f0fdf4', color: '#16a34a' }}>
                                                        <Mic size={16} strokeWidth={2.5} />
                                                    </button>
                                                ) : (
                                                    <button type="submit" style={{ ...styles.actionBtn, background: '#2563eb', color: '#fff' }}>
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

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'fixed',
        bottom: '100px',
        right: '25px',
        width: '320px',
        height: '460px',
        maxHeight: 'calc(100vh - 140px)',
        background: '#fff',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        overflow: 'hidden',
        border: '1px solid #f1f5f9',
        transformOrigin: 'bottom right',
        animation: 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'inherit'
    },
    header: {
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '64px',
        zIndex: 10
    },
    headerBackBtn: {
        background: 'rgba(255,255,255,0.15)',
        border: 'none',
        color: '#fff',
        cursor: 'pointer',
        padding: '6px',
        display: 'flex',
        borderRadius: '8px',
        backdropFilter: 'blur(4px)'
    },
    headerCloseBtn: {
        background: 'rgba(255,255,255,0.15)',
        border: 'none',
        borderRadius: '8px',
        width: '28px',
        height: '28px',
        color: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)'
    },
    avatarContainer: {
        width: '38px',
        height: '38px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1.5px solid rgba(255,255,255,0.3)',
        background: '#fff'
    },
    menuContent: {
        padding: '20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff'
    },
    menuOptions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    menuItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: '16px',
        background: '#fff',
        border: '1px solid #f1f5f9',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
    },
    iconBox: {
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    messagesArea: {
        flex: 1,
        background: '#fcfdfe',
        padding: '14px',
        overflowY: 'auto',
    },
    inputArea: {
        padding: '12px',
        background: '#fff',
        borderTop: '1px solid #f1f5f9',
    },
    input: {
        flex: 1,
        padding: '10px 12px',
        borderRadius: '10px',
        border: 'none',
        outline: 'none',
        fontSize: '12px',
        background: 'transparent',
        color: '#0f172a',
        fontWeight: 700,
    },
    actionBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.2s',
        margin: '3px'
    }
};

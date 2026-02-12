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

export default function SupportChat() {
    const t = useTranslations('Chat');
    const { data: session } = useSession();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<ViewState>('menu');
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
            setView('chat');
        } else {
            toast.info(t('login_required'));
            router.push('/?auth=login');
        }
    };

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) setView('menu'); // Reset to menu when opening
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
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .support-fab {
                    position: fixed !important;
                    bottom: 30px !important;
                    right: 30px !important;
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #0052FF 0%, #0033CC 100%);
                    color: #fff;
                    border: none;
                    box-shadow: 0 8px 25px rgba(0, 82, 255, 0.4);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .support-fab::before {
                    content: '';
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: inherit;
                    border-radius: 50%;
                    z-index: -1;
                    animation: pulse-ring 2s infinite;
                }

                .menu-item-hover:hover {
                    background-color: #f8fafc;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }

                @media (max-width: 992px) {
                    .support-fab {
                        bottom: 90px !important;
                    }
                }

                @media (max-width: 768px) {
                    .support-fab {
                        width: 48px !important;
                        height: 48px !important;
                        bottom: 80px !important;
                        right: 20px !important;
                    }
                    .support-fab svg {
                        width: 24px !important;
                        height: 24px !important;
                    }
                    .support-window {
                        width: calc(100vw - 40px) !important;
                        max-width: 360px !important;
                        height: 500px !important;
                        max-height: 70vh !important;
                        bottom: 150px !important;
                        right: 20px !important;
                        border-radius: 20px !important;
                    }
                    .support-header {
                        padding: 12px 16px !important;
                        min-height: 60px !important;
                    }
                    .support-header h4 {
                        font-size: 15px !important;
                    }
                    .support-avatar {
                        width: 40px !important;
                        height: 40px !important;
                    }
                    .support-menu-content {
                        padding: 20px !important;
                    }
                    .support-menu-item {
                        padding: 12px !important;
                        gap: 12px !important;
                    }
                    .support-icon-box {
                        width: 40px !important;
                        height: 40px !important;
                    }
                    .support-icon-box svg {
                        width: 20px !important;
                        height: 20px !important;
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
                <Headset size={32} strokeWidth={2} />
            </button>

            {/* Window */}
            {isOpen && (
                <div style={styles.container} className="support-window">
                    {/* Header - Premium Redesign */}
                    <div style={styles.header} className="support-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            {view === 'chat' && (
                                <button onClick={() => setView('menu')} style={styles.headerBackBtn}>
                                    <ChevronLeft size={24} />
                                </button>
                            )}

                            <div style={styles.avatarContainer} className="support-avatar">
                                {view === 'menu' ? (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.2)' }}>
                                        <Headset size={22} color="#0052FF" />
                                    </div>
                                ) : (
                                    <img src="/team/asadbek.jpg" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                )}
                            </div>

                            <div>
                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff', letterSpacing: '0.3px', lineHeight: '1.2' }}>
                                    {view === 'menu' ? "Hadaf Yordam" : "Asadbek Davronov"}
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 5px #4ade80' }}></span>
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>{t('online')}</span>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setIsOpen(false)} style={styles.headerCloseBtn}>
                            <X size={18} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                        {view === 'menu' ? (
                            <div style={styles.menuContent} className="support-menu-content">
                                <div style={{ textAlign: 'center', marginBottom: '25px', marginTop: '10px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>{t('welcome')}</h3>
                                    <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
                                        {t('subtitle')}
                                    </p>
                                </div>

                                <div style={styles.menuOptions}>
                                    <button onClick={handleStartChat} style={styles.menuItem} className="menu-item-hover support-menu-item">
                                        <div style={{ ...styles.iconBox, background: '#e0f2fe', color: '#0284c7' }} className="support-icon-box">
                                            <MessageSquareText size={24} />
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 600, color: '#334155', fontSize: '15px' }}>{t('live_chat')}</div>
                                            <div style={{ fontSize: '13px', color: '#94a3b8' }}>{t('live_chat_desc')}</div>
                                        </div>
                                        <ChevronRight size={18} color="#cbd5e1" />
                                    </button>

                                    <a href="https://t.me/Hadaf_supportbot" target="_blank" rel="noopener noreferrer" style={{ ...styles.menuItem, textDecoration: 'none' }} className="menu-item-hover support-menu-item">
                                        <div style={{ ...styles.iconBox, background: '#dcfce7', color: '#16a34a' }} className="support-icon-box">
                                            <Send size={24} />
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 600, color: '#334155', fontSize: '15px' }}>{t('telegram_bot')}</div>
                                            <div style={{ fontSize: '13px', color: '#94a3b8' }}>{t('telegram_bot_desc')}</div>
                                        </div>
                                        <ChevronRight size={18} color="#cbd5e1" />
                                    </a>


                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Chat Area - Styled like Image 1 */}
                                <div ref={scrollRef} style={styles.messagesArea}>
                                    {loading && messages.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                            <Loader2 className="animate-spin" size={32} style={{ marginBottom: '10px', color: '#0052FF' }} />
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('loading')}</span>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center' }}>
                                            <div style={{ width: '80px', height: '80px', background: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                                                <MessageSquare size={36} color="#0052FF" />
                                            </div>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#334155' }}>{t('no_messages')}</h4>
                                            <p style={{ fontSize: '13px' }}>{t('no_messages_desc')}</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {messages.map(msg => {
                                                const isMe = msg.senderId === session?.user?.id;
                                                return (
                                                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                                        <div style={{
                                                            maxWidth: '75%',
                                                            padding: (msg.type === 'IMAGE' || msg.type === 'AUDIO' || msg.content.includes('blob.vercel-storage.com') || (msg.content.startsWith('/uploads/') && /\.(jpg|jpeg|png|gif|webp|webm|ogg|mp3|wav|mp4)$/i.test(msg.content))) ? '4px' : '12px 18px',
                                                            borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                                            background: isMe ? 'linear-gradient(135deg, #0052FF 0%, #0040DD 100%)' : '#fff',
                                                            color: isMe ? '#fff' : '#1e293b',
                                                            fontSize: '14px',
                                                            lineHeight: '1.5',
                                                            wordBreak: 'break-word',
                                                            boxShadow: isMe ? '0 4px 15px rgba(0, 82, 255, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)',
                                                            border: isMe ? 'none' : '1px solid #e2e8f0',
                                                            overflow: 'hidden'
                                                        }}>
                                                            {msg.type === 'IMAGE' || (msg.content.includes('blob.vercel-storage.com') && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.content)) || (msg.content.startsWith('/uploads/') && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.content)) ? (
                                                                <img
                                                                    src={msg.content}
                                                                    alt="Chat image"
                                                                    style={{ width: '100%', borderRadius: '14px', display: 'block' }}
                                                                    onClick={() => window.open(msg.content, '_blank')}
                                                                />
                                                            ) : (msg.type === 'AUDIO' || (msg.content.includes('blob.vercel-storage.com') && /\.(webm|ogg|mp3|wav|mp4)$/i.test(msg.content)) || (msg.content.startsWith('/uploads/') && /\.(webm|ogg|mp3|wav|mp4)$/i.test(msg.content))) ? (
                                                                <div style={{ minWidth: '220px', padding: '6px' }}>
                                                                    <audio
                                                                        controls
                                                                        style={{ width: '100%', height: '40px' }}
                                                                        preload="metadata"
                                                                    >
                                                                        <source src={msg.content} />
                                                                        Sizning brauzeringiz audioni qo'llab-quvvatlamaydi.
                                                                    </audio>
                                                                </div>
                                                            ) : (
                                                                msg.content
                                                            )}
                                                        </div>
                                                        <span style={{ fontSize: '10px', color: '#94a3b8', alignSelf: 'flex-end', marginLeft: '8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {isMe && (
                                                                msg.isRead ?
                                                                    <CheckCheck size={14} color="#4ade80" /> :
                                                                    <Check size={14} color="#94a3b8" />
                                                            )}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Input - Styled like Image 1 */}
                                <form onSubmit={handleSend} style={styles.inputArea}>
                                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        {isRecording ? (
                                            <div style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 20px',
                                                background: '#f1f5f9',
                                                borderRadius: '25px',
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444' }}>
                                                    <span style={{
                                                        width: '10px',
                                                        height: '10px',
                                                        background: '#ef4444',
                                                        borderRadius: '50%',
                                                        boxShadow: '0 0 8px #ef4444'
                                                    }}></span>
                                                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{formatTime(recordingTime)}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={stopRecording}
                                                    style={{
                                                        color: '#0052FF',
                                                        fontWeight: 700,
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '14px'
                                                    }}
                                                >
                                                    {t('stop_and_send')}
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <label style={{
                                                    position: 'absolute',
                                                    left: '12px',
                                                    cursor: 'pointer',
                                                    color: '#64748b',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '4px',
                                                    zIndex: 2
                                                }}>
                                                    <Paperclip size={20} />
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        style={{ display: 'none' }}
                                                    />
                                                </label>

                                                <input
                                                    placeholder={t('input_placeholder')}
                                                    value={inputValue}
                                                    onChange={e => setInputValue(e.target.value)}
                                                    style={styles.input}
                                                />

                                                {!inputValue.trim() ? (
                                                    <button
                                                        type="button"
                                                        onClick={startRecording}
                                                        style={{
                                                            ...styles.sendBtn,
                                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                            position: 'absolute',
                                                            right: '6px',
                                                            zIndex: 3,
                                                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
                                                        }}
                                                    >
                                                        <Mic size={18} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="submit"
                                                        style={{
                                                            ...styles.sendBtn,
                                                            position: 'absolute',
                                                            right: '6px',
                                                            zIndex: 3
                                                        }}
                                                    >
                                                        <Send size={18} />
                                                    </button>
                                                )}
                                            </>
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
        position: 'fixed' as 'fixed',
        bottom: '100px',
        right: '25px',
        width: '380px',
        height: '600px',
        maxHeight: 'calc(100vh - 120px)',
        background: '#fff',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0,40,100,0.25)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.5)',
        transformOrigin: 'bottom right',
        animation: 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'inherit'
    },
    header: {
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #0052FF 0%, #0033CC 100%)',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 'auto',
        minHeight: '80px',
        boxShadow: '0 4px 15px rgba(0, 82, 255, 0.25)',
        zIndex: 10
    },
    headerBackBtn: {
        background: 'transparent',
        border: 'none',
        color: '#fff',
        cursor: 'pointer',
        padding: '8px',
        marginRight: '0px',
        marginLeft: '-8px',
        display: 'flex',
        borderRadius: '50%',
        transition: 'background 0.2s',
    },
    headerCloseBtn: {
        background: 'rgba(255,255,255,0.15)',
        border: 'none',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        color: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        backdropFilter: 'blur(4px)'
    },
    avatarContainer: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid rgba(255,255,255,0.3)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        background: '#fff'
    },
    menuContent: {
        padding: '24px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#fcfcfc'
    },
    menuOptions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    menuItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px',
        borderRadius: '16px',
        background: '#fff',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
        position: 'relative',
        overflow: 'hidden'
    },
    iconBox: {
        width: '50px',
        height: '50px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px'
    },
    messagesArea: {
        flex: 1,
        background: '#f8fafc',
        padding: '20px',
        overflowY: 'auto',
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: '24px 24px'
    },
    inputArea: {
        padding: '16px',
        background: '#fff',
        borderTop: '1px solid #f1f5f9',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.02)'
    },
    input: {
        width: '100%',
        padding: '14px 55px 14px 45px', // Left padding increased to 45px for paperclip
        borderRadius: '25px',
        border: '1px solid #E2E8F0',
        outline: 'none',
        fontSize: '15px',
        background: '#fff',
        color: '#334155',
        boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
        transition: 'border 0.2s',
        zIndex: 1
    },
    sendBtn: {
        background: 'linear-gradient(135deg, #0052FF 0%, #0033CC 100%)',
        color: '#fff',
        border: 'none',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(0, 82, 255, 0.3)'
    }
};

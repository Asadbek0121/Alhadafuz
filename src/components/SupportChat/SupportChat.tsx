"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquareText, X, Send, User, Loader2, ChevronLeft, HelpCircle, Headset, ChevronRight, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Message = {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
};

type ViewState = 'menu' | 'chat';

export default function SupportChat() {
    const { data: session } = useSession();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<ViewState>('menu');
    const [admin, setAdmin] = useState<{ id: string, name: string, image: string } | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch Admin Contact on Mount
    useEffect(() => {
        fetch('/api/chat/support-contact')
            .then(res => res.json())
            .then(data => {
                if (!data.error) setAdmin(data);
            });
    }, []);

    // Fetch Messages when in chat view
    useEffect(() => {
        if (isOpen && view === 'chat' && session?.user && admin) {
            setLoading(true);
            fetchMessages();
            const interval = setInterval(fetchMessages, 5000); // Poll every 5s
            return () => clearInterval(interval);
        }
    }, [isOpen, view, session, admin]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, view]);

    const fetchMessages = () => {
        if (!admin) return;
        fetch(`/api/chat/messages?userId=${admin.id}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setMessages(data);
                    setLoading(false);
                }
            })
            .catch(() => setLoading(false));
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !admin || !session) return;

        const optimisticMsg = {
            id: Date.now().toString(),
            senderId: session.user.id || 'me',
            content: inputValue,
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setInputValue("");

        try {
            await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId: admin.id,
                    content: optimisticMsg.content
                })
            });
        } catch (error) {
            toast.error("Xabar yuborilmadi");
        }
    };

    const handleStartChat = () => {
        if (session) {
            setView('chat');
        } else {
            toast.info("Muloqot qilish uchun tizimga kiring");
            router.push('/auth/login');
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
                    bottom: 30px !important;
                    transition: bottom 0.3s ease;
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
                `
            }} />
            {/* FAB */}
            <button
                onClick={toggleOpen}
                className="support-fab"
                style={{ ...styles.fab, transform: isOpen ? 'rotate(90deg) scale(0)' : 'rotate(0) scale(1)' }}
            >
                <Headset size={30} strokeWidth={2} />
            </button>

            {/* Window */}
            {isOpen && (
                <div style={styles.container}>
                    {/* Header */}
                    <div style={styles.header}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {view === 'chat' && (
                                <button onClick={() => setView('menu')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                                    <ChevronLeft size={20} />
                                </button>
                            )}
                            <div>
                                <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, letterSpacing: '0.3px' }}>
                                    {view === 'menu' ? "Yordam Markazi" : (admin?.name || "Operator")}
                                </h4>
                                <span style={{ fontSize: '12px', opacity: 0.9, fontWeight: 500 }}>
                                    {view === 'menu' ? "Biz har doim aloqadamiz" : "Online"}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    {view === 'menu' ? (
                        <div style={styles.menuContent}>
                            <div style={{ textAlign: 'center', marginBottom: '25px', marginTop: '10px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>Assalomu alaykum! 👋</h3>
                                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
                                    Savollaringiz bormi? <br /> Quyidagi bo'limlardan birini tanlang
                                </p>
                            </div>

                            <div style={styles.menuOptions}>
                                <button onClick={handleStartChat} style={styles.menuItem} className="menu-item-hover">
                                    <div style={{ ...styles.iconBox, background: '#e0f2fe', color: '#0284c7' }}>
                                        <MessageSquareText size={24} />
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '15px' }}>Jonli chat</div>
                                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>Operator bilan suhbat</div>
                                    </div>
                                    <ChevronRight size={18} color="#cbd5e1" />
                                </button>

                                <a href="https://t.me/uzmarket_bot" target="_blank" rel="noopener noreferrer" style={{ ...styles.menuItem, textDecoration: 'none' }} className="menu-item-hover">
                                    <div style={{ ...styles.iconBox, background: '#dcfce7', color: '#16a34a' }}>
                                        <Send size={24} />
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '15px' }}>Telegram bot</div>
                                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>Bot orqali murojaat</div>
                                    </div>
                                    <ChevronRight size={18} color="#cbd5e1" />
                                </a>

                                <Link href="/faq" style={{ ...styles.menuItem, textDecoration: 'none' }} className="menu-item-hover">
                                    <div style={{ ...styles.iconBox, background: '#fef9c3', color: '#ca8a04' }}>
                                        <HelpCircle size={24} />
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '15px' }}>Savol-javoblar</div>
                                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>Ko'p so'raladigan savollar</div>
                                    </div>
                                    <ChevronRight size={18} color="#cbd5e1" />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Chat Area */}
                            <div ref={scrollRef} style={styles.messagesArea}>
                                {loading && messages.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                        <Loader2 className="animate-spin" size={32} style={{ marginBottom: '10px', color: '#0085db' }} />
                                        <span style={{ fontSize: '14px', fontWeight: 500 }}>Yuklanmoqda...</span>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center' }}>
                                        <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                                            <MessageSquare size={36} color="#cbd5e1" />
                                        </div>
                                        <h4 style={{ margin: '0 0 5px 0', color: '#334155' }}>Hozircha xabarlar yo'q</h4>
                                        <p style={{ fontSize: '13px' }}>Savollaringizni yozib qoldiring, tez orada javob beramiz.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {messages.map(msg => {
                                            const isMe = msg.senderId === session?.user?.id;
                                            return (
                                                <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                                    <div style={{
                                                        maxWidth: '85%',
                                                        padding: '12px 16px',
                                                        borderRadius: '16px',
                                                        background: isMe ? 'linear-gradient(135deg, #0085db 0%, #00a4e4 100%)' : '#f1f5f9',
                                                        color: isMe ? '#fff' : '#1e293b',
                                                        borderBottomRightRadius: isMe ? '4px' : '16px',
                                                        borderBottomLeftRadius: isMe ? '16px' : '4px',
                                                        fontSize: '14.5px',
                                                        lineHeight: '1.5',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                        wordBreak: 'break-word'
                                                    }}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSend} style={styles.inputArea}>
                                <input
                                    placeholder="Xabaringizni yozing..."
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    style={styles.input}
                                />
                                <button type="submit" disabled={!inputValue.trim()} style={{ ...styles.sendBtn, opacity: !inputValue.trim() ? 0.5 : 1 }}>
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

const styles: Record<string, React.CSSProperties> = {
    fab: {
        position: 'fixed' as 'fixed',
        bottom: '30px',
        right: '30px',
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #0085db 0%, #0060a0 100%)',
        color: '#fff',
        border: 'none',
        boxShadow: '0 8px 25px rgba(0, 133, 219, 0.4)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    },
    container: {
        position: 'fixed' as 'fixed',
        bottom: '110px',
        right: '30px',
        width: '360px',
        height: '550px',
        maxHeight: 'calc(100vh - 140px)',
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 15px 50px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.06)',
        transformOrigin: 'bottom right',
        animation: 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    },
    header: {
        padding: '18px 24px',
        background: 'linear-gradient(135deg, #0085db 0%, #00a4e4 100%)',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '70px'
    },
    closeBtn: {
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        color: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s'
    },
    menuContent: {
        padding: '24px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#fff'
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
        border: '1px solid #f1f5f9',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    },
    iconBox: {
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    messagesArea: {
        flex: 1,
        background: '#f8fafc',
        padding: '20px',
        overflowY: 'auto'
    },
    inputArea: {
        padding: '16px',
        background: '#fff',
        borderTop: '1px solid #f1f5f9',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
    },
    input: {
        flex: 1,
        padding: '12px 18px',
        borderRadius: '24px',
        border: '1px solid #e2e8f0',
        outline: 'none',
        fontSize: '14.5px',
        background: '#f8fafc',
        color: '#334155',
        transition: 'border-color 0.2s'
    },
    sendBtn: {
        background: 'linear-gradient(135deg, #0085db 0%, #00a4e4 100%)',
        color: '#fff',
        border: 'none',
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 12px rgba(0, 133, 219, 0.3)'
    }
};

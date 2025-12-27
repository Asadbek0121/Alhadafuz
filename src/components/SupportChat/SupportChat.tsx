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
                <div style={styles.container}>
                    {/* Header - Premium Redesign */}
                    <div style={styles.header}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            {view === 'chat' && (
                                <button onClick={() => setView('menu')} style={styles.headerBackBtn}>
                                    <ChevronLeft size={24} />
                                </button>
                            )}

                            <div style={styles.avatarContainer}>
                                {view === 'menu' ? (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.2)' }}>
                                        <Headset size={22} color="#fff" />
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
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>Online</span>
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

                                    <a href="https://t.me/Hadaf_supportbot" target="_blank" rel="noopener noreferrer" style={{ ...styles.menuItem, textDecoration: 'none' }} className="menu-item-hover">
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
                                {/* Chat Area - Styled like Image 1 */}
                                <div ref={scrollRef} style={styles.messagesArea}>
                                    {loading && messages.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                            <Loader2 className="animate-spin" size={32} style={{ marginBottom: '10px', color: '#0052FF' }} />
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Yuklanmoqda...</span>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center' }}>
                                            <div style={{ width: '80px', height: '80px', background: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                                                <MessageSquare size={36} color="#0052FF" />
                                            </div>
                                            <h4 style={{ margin: '0 0 5px 0', color: '#334155' }}>Hozircha xabarlar yo'q</h4>
                                            <p style={{ fontSize: '13px' }}>Savollaringizni yozib qoldiring, tez orada javob beramiz.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {messages.map(msg => {
                                                const isMe = msg.senderId === session?.user?.id;
                                                return (
                                                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                                        <div style={{
                                                            maxWidth: '75%',
                                                            padding: '12px 18px',
                                                            borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                                            background: isMe ? 'linear-gradient(135deg, #0052FF 0%, #0040DD 100%)' : '#fff',
                                                            color: isMe ? '#fff' : '#1e293b',
                                                            fontSize: '14px',
                                                            lineHeight: '1.5',
                                                            wordBreak: 'break-word',
                                                            boxShadow: isMe ? '0 4px 15px rgba(0, 82, 255, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)',
                                                            border: isMe ? 'none' : '1px solid #e2e8f0'
                                                        }}>
                                                            {msg.content}
                                                        </div>
                                                        {!isMe && (
                                                            <span style={{ fontSize: '10px', color: '#94a3b8', alignSelf: 'flex-end', marginLeft: '8px', marginBottom: '4px' }}>
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Input - Styled like Image 1 */}
                                <form onSubmit={handleSend} style={styles.inputArea}>
                                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            placeholder="Xabaringizni yozing..."
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            style={styles.input}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!inputValue.trim()}
                                            style={{
                                                ...styles.sendBtn,
                                                opacity: !inputValue.trim() ? 0.5 : 1,
                                                position: 'absolute',
                                                right: '6px'
                                            }}
                                        >
                                            <Send size={18} />
                                        </button>
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
        padding: '14px 55px 14px 20px',
        borderRadius: '25px',
        border: '1px solid #E2E8F0',
        outline: 'none',
        fontSize: '15px',
        background: '#fff',
        color: '#334155',
        boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
        transition: 'border 0.2s'
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

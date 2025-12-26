
"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Search, Send, Phone, Video, Info, Menu, X, MessageCircle } from 'lucide-react';

type User = {
    id: string;
    name: string;
    image: string;
    status: 'online' | 'offline' | 'busy' | 'away';
    lastMessage?: string;
    time?: string;
    unread?: number;
};

type Message = {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
    type: 'text' | 'image';
    source?: 'WEB' | 'TELEGRAM';
};

export default function AdminChatPage() {
    const { data: session } = useSession();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [viewSource, setViewSource] = useState<'ALL' | 'WEB' | 'TELEGRAM'>('ALL');
    const [sendTarget, setSendTarget] = useState<'BOTH' | 'WEB' | 'TELEGRAM'>('BOTH');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Real Data State
    const [conversations, setConversations] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch conversations with polling
    useEffect(() => {
        const fetchConversations = () => {
            fetch('/api/chat/conversations')
                .then(res => {
                    const contentType = res.headers.get("content-type");
                    if (res.ok && contentType && contentType.includes("application/json")) {
                        return res.json();
                    }
                    return null;
                })
                .then(data => {
                    if (data && !data.error) {
                        setConversations(data);
                        if (loading && data.length > 0) {
                            if (window.innerWidth > 768) setSelectedUser(data[0]);
                            setLoading(false);
                        }
                    }
                })
                .catch(err => console.error("Conversations fetch error:", err));
        };

        fetchConversations();
        const interval = setInterval(fetchConversations, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [loading]);

    // Fetch messages with polling
    useEffect(() => {
        if (!selectedUser) return;

        const fetchMessages = () => {
            fetch(`/api/chat/messages?userId=${selectedUser.id}`)
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
                    }
                })
                .catch(err => console.error("Messages fetch error:", err));
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, [selectedUser]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedUser) return;

        const optimisticMsg: Message = {
            id: Date.now().toString(),
            senderId: session?.user?.id as string,
            content: messageInput,
            createdAt: new Date().toISOString(),
            type: 'text'
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setMessageInput("");

        try {
            await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId: selectedUser.id,
                    content: optimisticMsg.content,
                    target: sendTarget
                })
            });
        } catch (error) {
            console.error("Yuborishda xatolik:", error);
        }
    };

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 100px)', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 0 20px rgba(0,0,0,0.05)' }}>

            {/* Sidebar List */}
            <div className={`chat-sidebar ${mobileSidebarOpen ? 'open' : ''}`} style={{ width: '320px', borderRight: '1px solid #e5eaef', display: 'flex', flexDirection: 'column' }}>

                {/* User Profile Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #e5eaef', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                        <img src={session?.user?.image || "https://ui-avatars.com/api/?name=Admin"} style={{ width: '45px', height: '45px', borderRadius: '50%' }} />
                        <span style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: '#00ceb6', borderRadius: '50%', border: '2px solid #fff' }}></span>
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '16px', color: '#2A3547' }}>{session?.user?.name || "Admin"}</h4>
                        <span style={{ fontSize: '12px', color: '#5A6A85' }}>Boshqaruvchi</span>
                    </div>
                    {mobileSidebarOpen && <button onClick={() => setMobileSidebarOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none' }}><X /></button>}
                </div>

                {/* Search */}
                <div style={{ padding: '20px' }}>
                    <div style={{ position: 'relative' }}>
                        <input placeholder="Foydalanuvchilarni izlash" style={{ width: '100%', padding: '10px 15px 10px 40px', borderRadius: '8px', border: '1px solid #e5eaef', outline: 'none', fontSize: '14px' }} />
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#5A6A85' }} />
                    </div>
                </div>

                {/* Contacts List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? <div style={{ padding: '20px', textAlign: 'center' }}>Yuklanmoqda...</div> :
                        conversations.map(user => (
                            <div
                                key={user.id}
                                onClick={() => { setSelectedUser(user); setMobileSidebarOpen(false); }}
                                style={{
                                    padding: '15px 20px',
                                    display: 'flex',
                                    gap: '15px',
                                    cursor: 'pointer',
                                    background: selectedUser?.id === user.id ? '#ecf2ff' : 'transparent',
                                    borderLeft: selectedUser?.id === user.id ? '4px solid #0085db' : '4px solid transparent'
                                }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <img src={user.image} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <h5 style={{ margin: 0, fontSize: '14px', color: '#2A3547' }}>{user.name}</h5>
                                        <span style={{ fontSize: '11px', color: '#5A6A85' }}>{user.time || ''}</span>
                                    </div>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5A6A85', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                                        {user.lastMessage || "Xabar yo'q"}
                                    </p>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>

                {selectedUser ? (
                    <>
                        {/* Header */}
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #e5eaef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button className="mobile-menu-btn" onClick={() => setMobileSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'none' }}>
                                    <Menu />
                                </button>
                                <img src={selectedUser.image} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                <div>
                                    <h5 style={{ margin: 0, fontSize: '15px', color: '#2A3547' }}>{selectedUser.name}</h5>
                                    <span style={{ fontSize: '12px', color: '#00ceb6' }}>Online</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', color: '#5A6A85' }}>
                                <Phone size={20} style={{ cursor: 'pointer' }} />
                                <Video size={20} style={{ cursor: 'pointer' }} />
                                <Info size={20} style={{ cursor: 'pointer' }} />
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div style={{ display: 'flex', gap: '10px', padding: '10px 24px', background: '#fff', borderBottom: '1px solid #f1f4f9' }}>
                            {['ALL', 'WEB', 'TELEGRAM'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setViewSource(s as any)}
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '20px',
                                        border: '1px solid',
                                        borderColor: viewSource === s ? '#0085db' : '#E5EAEF',
                                        background: viewSource === s ? '#e0f2fe' : '#fff',
                                        color: viewSource === s ? '#0085db' : '#5A6A85',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {s === 'ALL' ? 'Barchasi' : s === 'WEB' ? '🌐 Ilova' : '📱 Telegram'}
                                </button>
                            ))}
                        </div>

                        {/* Messages - Styled like Image 2 */}
                        <div ref={scrollRef} style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#F8F9FA', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {messages.filter(m => viewSource === 'ALL' || m.source === viewSource).map((msg) => {
                                const isMe = msg.senderId === session?.user?.id;
                                return (
                                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', gap: '6px' }}>
                                            <div style={{
                                                padding: '12px 20px',
                                                borderTopLeftRadius: isMe ? '12px' : '0px',
                                                borderTopRightRadius: isMe ? '0px' : '12px',
                                                borderBottomLeftRadius: '12px',
                                                borderBottomRightRadius: '12px',
                                                background: isMe ? '#0085db' : '#fff',
                                                color: isMe ? '#fff' : '#2A3547',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                                fontSize: '15px',
                                                lineHeight: '1.5',
                                                border: isMe ? 'none' : '1px solid #F1F4F9'
                                            }}>
                                                {msg.content}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {msg.source === 'TELEGRAM' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#5A6A85', background: '#fff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #E5EAEF' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center' }}>📱</span>
                                                        <span style={{ fontWeight: 500 }}>Telegram</span>
                                                    </div>
                                                )}
                                                {(msg.source === 'WEB' || !msg.source) && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#5A6A85', background: '#fff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #E5EAEF' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center' }}>🌐</span>
                                                        <span style={{ fontWeight: 500 }}>Ilova</span>
                                                    </div>
                                                )}
                                                <span style={{ fontSize: '11px', color: '#8E98A8' }}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: '20px', borderTop: '1px solid #e5eaef', background: '#fff' }}>
                            {/* Destination Selector */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', color: '#5A6A85', alignSelf: 'center', marginRight: '5px' }}>Javob turi:</span>
                                {['BOTH', 'WEB', 'TELEGRAM'].map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setSendTarget(t as any)}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid',
                                            borderColor: sendTarget === t ? '#0085db' : '#e5eaef',
                                            background: sendTarget === t ? '#e0f2fe' : '#fff',
                                            color: sendTarget === t ? '#0085db' : '#5A6A85',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {t === 'BOTH' ? 'Hammasiga' : t === 'WEB' ? 'Faqat Ilova' : 'Faqat Telegram'}
                                    </button>
                                ))}
                            </div>
                            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '15px' }}>
                                <input
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                    placeholder={sendTarget === 'BOTH' ? "Hamma yo'nalishda javob yozish..." : sendTarget === 'WEB' ? "Ilovaga javob yozish..." : "Telegramga javob yozish..."}
                                    style={{ flex: 1, padding: '12px 18px', borderRadius: '10px', border: '1px solid #e5eaef', outline: 'none', fontSize: '15px' }}
                                />
                                <button type="submit" style={{ background: '#0085db', border: 'none', borderRadius: '10px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,133,219,0.2)' }}>
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#5A6A85' }}>
                        <MessageCircle size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <h3>Suhbatni tanlang</h3>
                    </div>
                )}
            </div>

            <style jsx>{`
                @media (max-width: 768px) {
                    .chat-sidebar {
                        position: absolute;
                        left: -320px;
                        top: 0;
                        bottom: 0;
                        z-index: 100;
                        background: #fff;
                        transition: left 0.3s ease;
                    }
                    .chat-sidebar.open {
                        left: 0;
                    }
                    .mobile-menu-btn {
                        display: block !important;
                    }
                }
            `}</style>
        </div>
    );
}

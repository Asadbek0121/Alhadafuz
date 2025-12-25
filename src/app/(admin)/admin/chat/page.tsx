
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
};

export default function AdminChatPage() {
    const { data: session } = useSession();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Real Data State
    const [conversations, setConversations] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch conversations on load
    useEffect(() => {
        fetch('/api/chat/conversations')
            .then(res => res.json())
            .then(data => {
                setConversations(data);
                if (data.length > 0) {
                    if (window.innerWidth > 768) setSelectedUser(data[0]);
                }
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    // Fetch messages when user is selected
    useEffect(() => {
        if (selectedUser) {
            fetch(`/api/chat/messages?userId=${selectedUser.id}`)
                .then(res => res.json())
                .then(data => setMessages(data))
                .catch(err => console.error(err));
        }
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
                    content: optimisticMsg.content
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

                        {/* Messages */}
                        <div ref={scrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f4f7fb', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {messages.map((msg) => {
                                const isMe = msg.senderId === session?.user?.id;
                                return (
                                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                            <div style={{
                                                padding: '12px 18px',
                                                borderRadius: '12px',
                                                background: isMe ? '#0085db' : '#fff',
                                                color: isMe ? '#fff' : '#2A3547',
                                                boxShadow: isMe ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
                                                borderTopRightRadius: isMe ? '0' : '12px',
                                                borderTopLeftRadius: !isMe ? '0' : '12px'
                                            }}>
                                                {msg.content}
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: '20px', borderTop: '1px solid #e5eaef' }}>
                            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '15px' }}>
                                <input
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                    placeholder="Xabar yozish..."
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e5eaef', outline: 'none' }}
                                />
                                <button type="submit" style={{ background: '#0085db', border: 'none', borderRadius: '8px', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
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

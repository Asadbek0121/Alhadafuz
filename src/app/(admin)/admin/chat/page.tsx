// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute

"use client";

import styles from './ChatPage.module.css';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Search, Send, Menu, X, MessageCircle, Check, CheckCheck, Trash2, Paperclip } from 'lucide-react';
/**
 * Xabar matni fayl havolasimi yoki oddiy matnmi — `src/lib/chat-media.ts`da.
 *
 * Ilgari bu yerda faqat `/uploads/` prefiksi tekshirilardi, lekin
 * `/api/upload` Vercel Blob (yoki Cloudinary) havolasini qaytaradi —
 * natijada mijoz yuborgan rasm va ovozli xabarlar admin panelda uzun havola
 * matni bo'lib ko'rinardi.
 */
import { mediaKind, isFileUrl } from '@/lib/chat-media';

type User = {
    id: string;
    name: string;
    image: string;
    status: 'online' | 'offline' | 'busy' | 'away';
    hasTelegram?: boolean;
    lastMessage?: string;
    time?: string;
    unread?: number;
};

/**
 * `Message.source` bazada 4 xil qiymat oladi va har biri boshqa yo'ldan
 * keladi. Ilgari bu tur faqat 'WEB' | 'TELEGRAM' edi, shu sababli
 * SUPPORT_CHAT va ADMIN_PANEL xabarlari hech qanday manba belgisi olmasdi —
 * ya'ni bazadagi xabarlarning aksariyati belgisiz ko'rinardi.
 */
type MessageSource = 'WEB' | 'TELEGRAM' | 'SUPPORT_CHAT' | 'ADMIN_PANEL';

type Message = {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
    type: 'TEXT' | 'IMAGE' | 'AUDIO';
    source?: MessageSource;
    isRead?: boolean;
    pending?: boolean;
    failed?: boolean;
};

const SOURCE_LABELS: Record<MessageSource, { icon: string; label: string }> = {
    TELEGRAM: { icon: '📱', label: 'Telegram' },
    SUPPORT_CHAT: { icon: '💬', label: 'Sayt chati' },
    ADMIN_PANEL: { icon: '🛠️', label: 'Admin panel' },
    WEB: { icon: '🌐', label: 'Ilova' }
};

/** Admin uchun tezkor javob shablonlari — bosilganda input'ga to'ldiriladi. */
const REPLY_TEMPLATES: { label: string; text: string }[] = [
    { label: '📦 Yetkazish', text: "Assalomu alaykum! Yetkazib berish bo'yicha: Termiz shahri ichida 1 kun, tumanlarga 2-3 kun. Batafsil /uz/delivery sahifasida." },
    { label: '💳 To\'lov', text: "Assalomu alaykum! To'lov usullari: Click, Payme, bank karta (Uzcard/Humo), yetkazib berilganda naqd pul." },
    { label: '↩️ Qaytarish', text: "Assalomu alaykum! Mahsulotni 10 kun ichida qaytarishingiz mumkin (ishlatilmagan, qadoqlari butun). Shartlar /uz/returns sahifasida." },
    { label: '⏰ Muddat', text: "Assalomu alaykum! Buyurtmangiz ko'rib chiqilmoqda. Kuryer tayinlangach /uz/delivery sahifasida kuzatishingiz mumkin." },
    { label: '🏪 Do\'kon', text: "Assalomu alaykum! Markaziy do'konimiz Termiz shahrida. Manzil va ish vaqti /uz/stores sahifasida." }
];

export default function AdminChatPage() {
    const { data: session } = useSession();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [search, setSearch] = useState("");

    // Real Data State
    const [conversations, setConversations] = useState<User[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    // Server xatosi. Poll har 3-5 sekundda ishlaydi, shu sababli toast emas —
    // ekranda turadigan yozuv: aks holda xato 20 marta sakrab chiqardi.
    const [loadError, setLoadError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    // Yuborilgan, ammo hali serverdan qaytmagan xabarlar. Poll natijasi
    // kelganda ular o'chiriladi — ilgari optimistik xabar ro'yxatda qolib,
    // haqiqiy xabar kelgach bir muddat ikki marta ko'rinardi.
    const pendingRef = useRef<Message[]>([]);
    const didAutoSelect = useRef(false);

    // Suhbatlar ro'yxati — 5 sekundda bir yangilanadi.
    // `loading` bog'liqliklardan olib tashlandi: u o'zgarganda interval
    // bekor qilinib qaytadan qurilardi.
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
                    if (Array.isArray(data)) {
                        setConversations(data);
                        // Kompyuterda birinchi suhbat avtomatik ochiladi, lekin
                        // faqat bir marta — aks holda har bir poll admin
                        // tanlagan suhbatni almashtirib yuborardi.
                        if (!didAutoSelect.current && data.length > 0) {
                            didAutoSelect.current = true;
                            if (window.innerWidth > 991) setSelectedUser(data[0]);
                        }
                    }
                })
                .catch(err => console.error("Conversations fetch error:", err))
                .finally(() => setLoading(false));
        };

        fetchConversations();
        const interval = setInterval(fetchConversations, 5000);
        return () => clearInterval(interval);
    }, []);

    // Fetch messages with polling
    useEffect(() => {
        if (!selectedUser) return;
        const userId = selectedUser.id;

        const fetchMessages = () => {
            fetch(`/api/chat/messages?userId=${userId}`)
                .then(async res => {
                    if (!res.ok) {
                        // Ilgari non-ok javob jimgina `null` bo'lib ketardi:
                        // 500 xato ham "yozishma yo'q" ko'rinishida chiqardi.
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.error || `Server xatosi (${res.status})`);
                    }
                    return res.json();
                })
                .then(data => {
                    if (data && Array.isArray(data)) {
                        setLoadError(null);
                        // Serverga yetib borgan optimistik xabarlar tashlanadi
                        const serverContents = new Set(data.map((m: Message) => m.content));
                        pendingRef.current = pendingRef.current.filter(
                            p => p.failed || !serverContents.has(p.content)
                        );
                        setMessages([...data, ...pendingRef.current]);
                    }
                })
                .catch(err => {
                    console.error("Messages fetch error:", err);
                    setLoadError(err.message || 'Xabarlarni yuklab bo\'lmadi');
                });
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [selectedUser]);

    // Suhbat almashganda oldingi suhbatning yuborilmagan xabarlari tozalanadi
    useEffect(() => {
        pendingRef.current = [];
        setLoadError(null);
    }, [selectedUser?.id]);

    // Ro'yxatni izlash. Ilgari bu maydonning `value`/`onChange`'i yo'q edi —
    // yozish mumkin, lekin filtrlash umuman ishlamasdi.
    const filteredConversations = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return conversations;
        return conversations.filter(c => c.name.toLowerCase().includes(q));
    }, [conversations, search]);

    // `selectedUser` — bosilgan paytdagi nusxa; poll uni yangilamaydi. Sarlavhada
    // shuning uchun ro'yxatdagi jonli yozuv ishlatiladi: aks holda suhbat
    // ochilib xabarlar o'qilgan deb belgilangandan keyin ham "N o'qilmagan
    // xabar" yozuvi qotib qolardi.
    const activeUser = useMemo(
        () => conversations.find(c => c.id === selectedUser?.id) || selectedUser,
        [conversations, selectedUser]
    );

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = messageInput.trim();
        if (!content || !selectedUser || sending) return;

        const optimisticMsg: Message = {
            id: `pending-${Date.now()}`,
            senderId: session?.user?.id as string,
            content,
            createdAt: new Date().toISOString(),
            type: 'TEXT',
            source: 'ADMIN_PANEL',
            pending: true
        };

        pendingRef.current = [...pendingRef.current, optimisticMsg];
        setMessages(prev => [...prev, optimisticMsg]);
        setMessageInput("");
        setSending(true);

        try {
            const res = await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId: selectedUser.id,
                    content,
                    target: 'BOTH'
                })
            });

            // Ilgari javob umuman tekshirilmasdi: xabar yuborilmagan bo'lsa
            // ham ekranda muvaffaqiyatli ketgandek turardi.
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Xabar yuborilmadi');
            }

            // Xabar bazaga yozildi, lekin Telegramga yetmagan bo'lishi mumkin
            // (bot bloklangan, mijoz botni ochmagan). Admin buni bilishi kerak,
            // aks holda javob berdim deb o'ylab qoladi.
            const data = await res.json().catch(() => null);
            if (data?.telegram?.attempted && !data.telegram.delivered) {
                toast.warning(`Telegramga yetmadi: ${data.telegram.error || 'sabab noma\'lum'}`);
            }
        } catch (error: any) {
            pendingRef.current = pendingRef.current.map(p =>
                p.id === optimisticMsg.id ? { ...p, pending: false, failed: true } : p
            );
            setMessages(prev => prev.map(m =>
                m.id === optimisticMsg.id ? { ...m, pending: false, failed: true } : m
            ));
            toast.error(error.message || "Xabar yuborishda xatolik");
        } finally {
            setSending(false);
        }
    };

    const handleClearHistory = async () => {
        if (!selectedUser || !confirm("Siz rostdan ham ushbu suhbat tarixini butkul o'chirib tashlamoqchimisiz?")) return;

        try {
            const res = await fetch(`/api/chat/messages?userId=${selectedUser.id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                pendingRef.current = [];
                setMessages([]);
                toast.success("Suhbat tarixi o'chirildi");
            } else {
                toast.error(data.error || "Xatolik yuz berdi");
            }
        } catch (error) {
            toast.error("Xatolik yuz berdi");
        }
    };

    return (
        <div className={styles.chatContainer}>

            {/* Mobil/planshetda ro'yxat ochiq bo'lganda fon qatlami — tashqarisiga
                bosib yopish uchun. Ilgari faqat X tugmasi bilan yopilardi. */}
            {mobileSidebarOpen && (
                <div
                    onClick={() => setMobileSidebarOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 999 }}
                />
            )}

            {/* Sidebar List */}
            <div className={`${styles.sidebar} ${mobileSidebarOpen ? styles.sidebarOpen : ''}`}>

                {/* User Profile Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #e5eaef', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                        <img alt="Rasm" src={session?.user?.image || "https://ui-avatars.com/api/?name=Admin"} style={{ width: '45px', height: '45px', borderRadius: '50%' }} />
                        <span style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: '#00ceb6', borderRadius: '50%', border: '2px solid #fff' }}></span>
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '16px', color: '#2A3547' }}>{session?.user?.name || "Admin"}</h4>
                        <span style={{ fontSize: '12px', color: '#5A6A85' }}>Boshqaruvchi</span>
                    </div>
                    {mobileSidebarOpen && <button onClick={() => setMobileSidebarOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none' }} title="Yopish"><X /></button>}
                </div>

                {/* Search */}
                <div style={{ padding: '20px' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Foydalanuvchilarni izlash"
                            style={{ width: '100%', padding: '10px 15px 10px 40px', borderRadius: '8px', border: '1px solid #e5eaef', outline: 'none', fontSize: '14px' }}
                        />
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#5A6A85' }} />
                    </div>
                </div>

                {/* Contacts List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? <div style={{ padding: '20px', textAlign: 'center' }}>Yuklanmoqda...</div> :
                        filteredConversations.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#5A6A85', fontSize: '13px' }}>
                                {search ? `"${search}" bo'yicha hech kim topilmadi` : 'Suhbat yo\'q'}
                            </div>
                        ) :
                        filteredConversations.map(user => (
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
                                    <img alt="Rasm" src={user.image} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <h5 style={{ margin: 0, fontSize: '14px', color: '#2A3547' }}>{user.name}</h5>
                                        <span style={{ fontSize: '11px', color: '#5A6A85' }}>{user.time || ''}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#5A6A85', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px', flex: 1 }}>
                                            {user.lastMessage || "Xabar yo'q"}
                                        </p>
                                        {!!user.unread && user.unread > 0 && (
                                            <span
                                                title={`${user.unread} o'qilmagan xabar`}
                                                style={{
                                                    background: '#fa896b',
                                                    color: '#fff',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    minWidth: '20px',
                                                    height: '20px',
                                                    borderRadius: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '0 6px',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {user.unread}
                                            </span>
                                        )}
                                    </div>
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
                                <button className="mobile-menu-btn" onClick={() => setMobileSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'none' }} title="Menyu">
                                    <Menu />
                                </button>
                                <img alt="Rasm" src={activeUser!.image} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                <div>
                                    <h5 style={{ margin: 0, fontSize: '15px', color: '#2A3547' }}>{activeUser!.name}</h5>
                                    {/* Ilgari bu yerda qat'iy "Online" yozilgan edi — hech qachon
                                        yozishmagan mijoz ham "Online" ko'rinardi. Endi haqiqiy
                                        ma'lumot: o'qilmagan xabarlar soni yoki oxirgi yozishma vaqti. */}
                                    <span style={{ fontSize: '12px', color: activeUser!.unread ? '#fa896b' : '#5A6A85' }}>
                                        {activeUser!.unread
                                            ? `${activeUser!.unread} o'qilmagan xabar`
                                            : activeUser!.time
                                                ? `Oxirgi xabar: ${activeUser!.time}`
                                                : 'Yozishma yo\'q'}
                                        {activeUser!.hasTelegram
                                            ? <span title="Javob Telegram botga ham yetib boradi" style={{ marginLeft: '8px', color: '#0088cc' }}>📱 Telegram ulangan</span>
                                            : <span title="Mijoz botni ochmagan — javob faqat saytda ko'rinadi" style={{ marginLeft: '8px', color: '#8E98A8' }}>Telegram ulanmagan</span>}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <button
                                    onClick={handleClearHistory}
                                    title="Suhbatni tozalash"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '8px',
                                        border: '1px solid #fee2e2',
                                        background: '#fef2f2',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = '#fee2e2' }}
                                    onMouseOut={e => { e.currentTarget.style.background = '#fef2f2' }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>



                        {/* Messages - Styled like Image 2 */}
                        <div ref={scrollRef} style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#F8F9FA', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {loadError && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>
                                    {loadError}
                                </div>
                            )}
                            {!loadError && messages.length === 0 && (
                                <div style={{ margin: 'auto', textAlign: 'center', color: '#8E98A8', fontSize: '14px' }}>
                                    <MessageCircle size={40} style={{ opacity: 0.25, marginBottom: '10px' }} />
                                    <div>Bu mijoz bilan hali yozishma yo&apos;q.</div>
                                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Birinchi xabarni yozing — mijoz Telegram&apos;ga ulangan bo&apos;lsa, botga ham yetib boradi.</div>
                                </div>
                            )}
                            {messages.map((msg) => {
                                const isMe = msg.senderId === session?.user?.id;
                                const kind = mediaKind(msg);
                                const badge = SOURCE_LABELS[msg.source ?? 'WEB'] ?? SOURCE_LABELS.WEB;
                                return (
                                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', gap: '6px' }}>
                                            <div style={{
                                                padding: kind === 'TEXT' ? '12px 20px' : '4px',
                                                borderTopLeftRadius: isMe ? '12px' : '0px',
                                                borderTopRightRadius: isMe ? '0px' : '12px',
                                                borderBottomLeftRadius: '12px',
                                                borderBottomRightRadius: '12px',
                                                background: msg.failed ? '#fef2f2' : (isMe ? '#0085db' : '#fff'),
                                                color: msg.failed ? '#b91c1c' : (isMe ? '#fff' : '#2A3547'),
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                                fontSize: '15px',
                                                lineHeight: '1.5',
                                                border: msg.failed ? '1px solid #fecaca' : (isMe ? 'none' : '1px solid #F1F4F9'),
                                                opacity: msg.pending ? 0.6 : 1,
                                                overflow: 'hidden'
                                            }}>
                                                {kind === 'IMAGE' ? (
                                                    <img
                                                        src={msg.content}
                                                        alt="Chat rasmi"
                                                        style={{ maxWidth: '100%', borderRadius: '8px', display: 'block', cursor: 'pointer' }}
                                                        onClick={() => window.open(msg.content, '_blank')}
                                                    />
                                                ) : kind === 'AUDIO' ? (
                                                    <div style={{ minWidth: '220px', padding: '6px' }}>
                                                        <audio
                                                            src={msg.content}
                                                            controls
                                                            style={{ width: '100%', height: '40px' }}
                                                            preload="metadata"
                                                        >
                                                            Sizning brauzeringiz audioni qo&apos;llab-quvvatlamaydi.
                                                        </audio>
                                                    </div>
                                                ) : (
                                                    // Rasm/ovoz bo'lmagan havola (masalan Telegram'dan
                                                    // kelgan PDF) ilgari bosib bo'lmaydigan xom matn
                                                    // bo'lib turardi — endi yuklab olish havolasi.
                                                    isFileUrl(msg.content) ? (
                                                        <a
                                                            href={msg.content}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ color: 'inherit', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '8px', wordBreak: 'break-all' }}
                                                        >
                                                            <Paperclip size={16} style={{ flexShrink: 0 }} />
                                                            {decodeURIComponent(msg.content.split('/').pop()?.split('?')[0] || 'Fayl')}
                                                        </a>
                                                    ) : msg.content
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#5A6A85', background: '#fff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #E5EAEF' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center' }}>{badge.icon}</span>
                                                    <span style={{ fontWeight: 500 }}>{badge.label}</span>
                                                </div>
                                                <span style={{ fontSize: '11px', color: '#8E98A8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {msg.failed ? 'Yuborilmadi' : new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {isMe && !msg.failed && (
                                                        msg.isRead ?
                                                            <CheckCheck size={14} color="#22c55e" /> :
                                                            <Check size={14} color="#94a3b8" />
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: '20px', borderTop: '1px solid #e5eaef', background: '#fff' }}>

                            {/* Tezkor javob shablonlari */}
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '10px', WebkitOverflowScrolling: 'touch' }}>
                                {REPLY_TEMPLATES.map((tpl, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setMessageInput(tpl.text)}
                                        style={{
                                            flexShrink: 0, padding: '7px 14px', borderRadius: '20px',
                                            border: '1px solid #dbe4f0', background: '#f4f7fb', color: '#334155',
                                            fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e0eaf7'; e.currentTarget.style.borderColor = '#0085db'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f4f7fb'; e.currentTarget.style.borderColor = '#dbe4f0'; }}
                                        title={tpl.text}
                                    >
                                        {tpl.label}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '15px' }}>
                                <input
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                    placeholder="Javob yozish..."
                                    style={{ flex: 1, padding: '12px 18px', borderRadius: '10px', border: '1px solid #e5eaef', outline: 'none', fontSize: '15px' }}
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !messageInput.trim()}
                                    style={{
                                        background: sending || !messageInput.trim() ? '#94a3b8' : '#0085db',
                                        border: 'none', borderRadius: '10px', width: '48px', height: '48px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', cursor: sending || !messageInput.trim() ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 12px rgba(0,133,219,0.2)'
                                    }}
                                    title="Yuborish"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#5A6A85' }}>
                        <MessageCircle size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0 }}>Suhbatni tanlang</h3>
                        {/* Mobil/planshetda suhbat avtomatik tanlanmaydi va ro'yxat
                            ekrandan chiqarilgan. Ilgari menyu tugmasi faqat suhbat
                            tanlangan holatda chizilardi — ya'ni telefonda sahifa
                            ochilganda ro'yxatga yetib borish yo'li umuman yo'q edi. */}
                        <button
                            className="mobile-menu-btn"
                            onClick={() => setMobileSidebarOpen(true)}
                            style={{
                                display: 'none', marginTop: '18px', padding: '10px 20px',
                                borderRadius: '10px', border: 'none', background: '#0085db',
                                color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                                alignItems: 'center', gap: '8px'
                            }}
                        >
                            <Menu size={18} /> Suhbatlar ro&apos;yxati
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
                /* ChatPage.module.css sidebar'ni 991px'dan pastda ekrandan
                   chiqarib qo'yadi (left: -350px). Ilgari bu tugma esa faqat
                   768px'dan pastda ko'rinardi — natijada 769-991px orasida
                   (planshetlar) suhbatlar ro'yxati yashirin qolib, uni ochish
                   imkoni bo'lmasdi. Endi ikki chegara bir xil. */
                @media (max-width: 991px) {
                    .mobile-menu-btn {
                        display: inline-flex !important;
                    }
                }
            `}</style>
        </div>
    );
}

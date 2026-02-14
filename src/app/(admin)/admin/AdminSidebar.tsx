"use client";

import { usePathname } from 'next/navigation';
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ weight: ["700", "900"], subsets: ["latin"] });

import Link from 'next/link';
import { Layers, Users, ShoppingBag, MessageCircle, FileStack, Palette, SlidersHorizontal, LayoutGrid, Lock, LogOut, FileText, Bell, MapPin, CreditCard, Truck, Star, Ticket } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

const menuItems = [
    { name: "Boshqaruv Paneli", icon: <Layers size={20} />, path: "/admin", roles: ["ADMIN", "VENDOR"] },
    { name: "Foydalanuvchilar", icon: <Users size={20} />, path: "/admin/users", roles: ["ADMIN"] },
    { name: "Mahsulotlar", icon: <ShoppingBag size={20} />, path: "/admin/products", roles: ["ADMIN", "VENDOR"] },
    { name: "Kuponlar", icon: <Ticket size={20} />, path: "/admin/coupons", roles: ["ADMIN"] },
    { name: "Xabarlar", icon: <MessageCircle size={20} />, path: "/admin/chat", roles: ["ADMIN", "VENDOR"] },
    { name: "Bildirishnomalar", icon: <Bell size={20} />, path: "/admin/notifications", roles: ["ADMIN"] },
    { name: "Buyurtmalar", icon: <FileStack size={20} />, path: "/admin/orders", roles: ["ADMIN", "VENDOR"] },
    { name: "Hisob-fakturalar", icon: <FileText size={20} />, path: "/admin/invoices", roles: ["ADMIN", "VENDOR"] },
    { name: "Kategoriyalar", icon: <LayoutGrid size={20} />, path: "/admin/categories", roles: ["ADMIN"] },
    { name: "Bannerlar", icon: <Palette size={18} />, path: "/admin/banners", roles: ["ADMIN"] },
    { name: "Do'konlar", icon: <MapPin size={20} />, path: "/admin/stores", roles: ["ADMIN"] },
    { name: "Yetkazib berish", icon: <Truck size={20} />, path: "/admin/shipping", roles: ["ADMIN"] },
    { name: "To'lovlar", icon: <CreditCard size={20} />, path: "/admin/payments", roles: ["ADMIN"] },
    { name: "Sharhlar", icon: <Star size={20} />, path: "/admin/reviews", roles: ["ADMIN", "VENDOR"] },
    { name: "Sozlamalar", icon: <SlidersHorizontal size={20} />, path: "/admin/settings", roles: ["ADMIN"] },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "USER";

    const filteredItems = menuItems.filter(item => item.roles.includes(userRole));

    return (
        <aside style={{
            width: '270px',
            background: '#fff',
            borderRight: '1px solid #e5eaef',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px'
        }}>
            {/* Logo & Return Link */}
            <div style={{ padding: '0 10px 20px 10px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0', textDecoration: 'none' }}>
                    <img src="/logo.png" alt="Hadaf Logo" style={{ height: '50px', width: 'auto', objectFit: 'contain' }} />
                    <div className="flex flex-col">
                        <span className={`${montserrat.className} text-2xl font-black leading-none text-[#0052FF] pt-1 uppercase tracking-tighter`}>Hadaf</span>
                        <span className="text-[8px] font-bold tracking-[0.2em] text-blue-500/80 uppercase mt-[-2px] ml-0.5">Market</span>
                    </div>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">
                        {userRole === "VENDOR" ? "Sotuvchi" : "Admin"}
                    </span>
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        style={{ textDecoration: 'none' }}
                    >
                        <LayoutGrid size={14} />
                        <span>Saytga o'tish</span>
                    </Link>
                </div>
            </div>

            {/* Menu */}
            <nav style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#2A3547', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '10px' }}>
                    Asosiy
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {filteredItems.map((item, index) => {
                        const isActive = pathname === item.path;
                        return (
                            <li key={index}>
                                <Link
                                    href={item.path}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 15px',
                                        borderRadius: '8px',
                                        textDecoration: 'none',
                                        color: isActive ? '#fff' : '#5A6A85',
                                        background: isActive ? '#0085db' : 'transparent',
                                        fontWeight: isActive ? 600 : 500,
                                        transition: 'all 0.2s ease-in-out'
                                    }}
                                >
                                    {item.icon}
                                    <span style={{ fontSize: '14px' }}>{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User Profile Mini */}
            <div style={{ marginTop: 'auto', background: '#f2f6fa', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {session?.user?.image ? (
                        <img src={session.user.image} alt={session.user.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <Users size={20} color="#0085db" />
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    <h6 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#2A3547' }}>{session?.user?.name || 'Admin'}</h6>
                    <span style={{ fontSize: '12px', color: '#5A6A85' }}>{(session?.user as any)?.role || 'Boshqaruvchi'}</span>
                </div>
                <button onClick={() => signOut()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0085db' }}>
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
}

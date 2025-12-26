"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Layers, Users, ShoppingBag, MessageCircle, FileStack, Palette, SlidersHorizontal, LayoutGrid, Lock, LogOut, FileText, Bell, MapPin } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

const menuItems = [
    { name: "Boshqaruv Paneli", icon: <Layers size={20} />, path: "/admin" },
    { name: "Foydalanuvchilar", icon: <Users size={20} />, path: "/admin/users" },
    { name: "Mahsulotlar", icon: <ShoppingBag size={20} />, path: "/admin/products" },
    { name: "Xabarlar", icon: <MessageCircle size={20} />, path: "/admin/chat" },
    { name: "Bildirishnomalar", icon: <Bell size={20} />, path: "/admin/notifications" },
    { name: "Buyurtmalar", icon: <FileStack size={20} />, path: "/admin/orders" },
    { name: "Hisob-fakturalar", icon: <FileText size={20} />, path: "/admin/invoices" },
    { name: "Kategoriyalar", icon: <LayoutGrid size={20} />, path: "/admin/categories" },
    { name: "Bannerlar", icon: <Palette size={20} />, path: "/admin/banners" },
    { name: "Do'konlar", icon: <MapPin size={20} />, path: "/admin/stores" },
    { name: "Sozlamalar", icon: <SlidersHorizontal size={20} />, path: "/admin/settings" },
    // { name: "Autentifikatsiya", icon: <Lock size={20} />, path: "/admin/auth" }, // Usually not needed in sidebar if already logged in
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const user = session?.user;

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
            {/* Logo */}
            <div style={{ padding: '0 10px 30px 10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', background: '#0085db', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
                    H
                </div>
                <span style={{ fontSize: '24px', fontWeight: '700', color: '#2A3547' }}>Hadaf Admin</span>
            </div>

            {/* Menu */}
            <nav style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#2A3547', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '10px' }}>
                    Asosiy
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {menuItems.map((item, index) => {
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
                    {user?.image ? (
                        <img src={user.image} alt={user.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <Users size={20} color="#0085db" />
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    <h6 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#2A3547' }}>{user?.name || 'Admin'}</h6>
                    <span style={{ fontSize: '12px', color: '#5A6A85' }}>{user?.role || 'Boshqaruvchi'}</span>
                </div>
                <button onClick={() => signOut()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0085db' }}>
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
}

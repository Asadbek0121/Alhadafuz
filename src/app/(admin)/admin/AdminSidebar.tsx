"use client";

import { usePathname } from 'next/navigation';
import { Montserrat } from "next/font/google";

import styles from './AdminSidebar.module.css';

const montserrat = Montserrat({ weight: ["700", "900"], subsets: ["latin"] });

import Link from 'next/link';
import { Layers, Users, ShoppingBag, MessageCircle, FileStack, Palette, SlidersHorizontal, LayoutGrid, Lock, LogOut, FileText, Bell, MapPin, CreditCard, Truck, Star, Ticket, Tag } from 'lucide-react';
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
    { name: "Elektron cheklar", icon: <FileText size={20} />, path: "/admin/receipts", roles: ["ADMIN"] },
    { name: "Kategoriyalar", icon: <LayoutGrid size={20} />, path: "/admin/categories", roles: ["ADMIN"] },
    { name: "Brendlar", icon: <Tag size={20} />, path: "/admin/brands", roles: ["ADMIN"] },
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
        <aside className={styles.sidebar}>
            {/* Logo & Return Link */}
            <div className={styles.logoContainer}>
                <Link href="/" className={styles.logoLink} aria-label="Bosh sahifaga qaytish">
                    <img src="/logo.png" alt="Hadaf Market Logo" className={styles.logoImg} />
                    <div className="flex flex-col">
                        <span className={`${montserrat.className} text-2xl font-black leading-none text-[#0052FF] pt-1 uppercase tracking-tighter`}>Hadaf</span>
                        <span className="text-[8px] font-bold tracking-[0.2em] text-blue-500/80 uppercase mt-[-2px] ml-0.5">Market</span>
                    </div>
                </Link>
                <div className={styles.roleAndLink}>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">
                        {userRole === "VENDOR" ? "Sotuvchi" : "Admin"}
                    </span>
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors no-underline"
                    >
                        <LayoutGrid size={14} />
                        <span>Saytga o'tish</span>
                    </Link>
                </div>
            </div>

            <nav className={styles.nav}>
                <div className={styles.sectionTitle}>
                    Asosiy
                </div>
                <ul className={styles.menuList}>
                    {filteredItems.map((item, index) => {
                        const isActive = pathname === item.path;
                        return (
                            <li key={index}>
                                <Link
                                    href={item.path}
                                    className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`}
                                    aria-current={isActive ? "page" : undefined}
                                >
                                    {item.icon}
                                    <span className={styles.menuItemText}>{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User Profile Mini */}
            <div className={styles.userProfile}>
                <div className={styles.userAvatar}>
                    {session?.user?.image ? (
                        <img src={session.user.image} alt={session.user.name || ''} className={styles.avatarImg} />
                    ) : (
                        <Users size={20} color="#0085db" />
                    )}
                </div>
                <div className={styles.userInfo}>
                    <h6 className={styles.userName}>{session?.user?.name || 'Admin'}</h6>
                    <span className={styles.userRole}>{(session?.user as any)?.role || 'Boshqaruvchi'}</span>
                </div>
                <button 
                    onClick={() => signOut()} 
                    className={styles.logoutBtn}
                    title="Chiqish"
                    aria-label="Tizimdan chiqish"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
}

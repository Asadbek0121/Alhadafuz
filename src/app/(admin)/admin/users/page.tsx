import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, User, Shield, Calendar, Mail } from "lucide-react";
import CreateUserModal from "./CreateUserModal";

async function getUsers(where: any, skip: number, take: number) {
    return await Promise.all([
        prisma.user.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: "desc" },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        }),
        prisma.user.count({ where }),
    ]);
}

export default async function TopshiriqUsersPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; q?: string }>;
}) {
    const params = await searchParams;
    const page = parseInt(params.page || "1");
    const limit = 10;
    const skip = (page - 1) * limit;
    const query = params.q || "";

    const where = query
        ? {
            OR: [
                { email: { contains: query, mode: 'insensitive' as const } },
                { name: { contains: query, mode: 'insensitive' as const } },
            ],
        }
        : {};

    // No cache wrapper, fetch fresh data
    const [users, total] = await getUsers(where, skip, limit);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="p-8 bg-gray-50/50 min-h-screen space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                            <User size={24} />
                        </div>
                        Foydalanuvchilar
                        <span className="text-sm font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                            {total}
                        </span>
                    </h1>
                    <p className="text-gray-500 font-medium">Platforma foydalanuvchilarini boshqarish</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Search */}
                    <form className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            name="q"
                            defaultValue={query}
                            placeholder="Email yoki ism orqali qidirish..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-white shadow-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:scale-[1.02] transition-all outline-none font-medium placeholder:text-gray-300"
                        />
                    </form>
                    <CreateUserModal />
                </div>
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="text-left py-6 px-8 text-xs font-black text-gray-400 uppercase tracking-widest">Foydalanuvchi</th>
                                <th className="text-left py-6 px-8 text-xs font-black text-gray-400 uppercase tracking-widest">Email</th>
                                <th className="text-left py-6 px-8 text-xs font-black text-gray-400 uppercase tracking-widest">Rol</th>
                                <th className="text-left py-6 px-8 text-xs font-black text-gray-400 uppercase tracking-widest">Qo'shilgan sana</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map((user: any) => (
                                <tr key={user.id} className="group hover:bg-blue-50/30 transition-colors">
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                                {user.name?.[0]?.toUpperCase() || <User size={18} />}
                                            </div>
                                            <Link
                                                href={`/admin/users/${user.id}`}
                                                className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors"
                                            >
                                                {user.name || "Nomsiz"}
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-2 text-gray-500 font-medium">
                                            <Mail size={14} className="text-gray-300" />
                                            {user.email}
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${user.role === "ADMIN"
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                                                : user.role === "VENDOR"
                                                    ? "bg-orange-500 text-white shadow-lg shadow-orange-100"
                                                    : "bg-gray-100 text-gray-600 ring-1 ring-gray-600/10"
                                                }`}
                                        >
                                            <Shield size={12} strokeWidth={2.5} />
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-2 text-gray-400 font-medium text-sm">
                                            <Calendar size={14} />
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {users.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <User className="text-gray-300" size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Foydalanuvchilar topilmadi</h3>
                        <p className="text-gray-500 mt-2">Qidiruv so'zini o'zgartirib ko'ring</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    {page > 1 && (
                        <Link
                            href={`/admin/users?page=${page - 1}&q=${query}`}
                            className="h-10 px-6 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold flex items-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                        >
                            <ChevronLeft size={18} /> Oldingi
                        </Link>
                    )}
                    <div className="h-10 px-6 rounded-xl bg-white border border-gray-200 text-gray-400 font-medium flex items-center gap-2 shadow-sm">
                        Sahifa <span className="text-gray-900 font-bold">{page}</span> / {totalPages}
                    </div>
                    {page < totalPages && (
                        <Link
                            href={`/admin/users?page=${page + 1}&q=${query}`}
                            className="h-10 px-6 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold flex items-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                        >
                            Keyingi <ChevronRight size={18} />
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}

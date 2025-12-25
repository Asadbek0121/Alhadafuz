
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { unstable_cache } from "next/cache";

const getUsers = unstable_cache(
    async (where: any, skip: number, take: number) => {
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
    },
    ['admin-users-list'],
    { tags: ['users'] }
);

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
                { email: { contains: query } },
                { name: { contains: query } },
            ],
        }
        : {};

    const [users, total] = await getUsers(where, skip, limit);

    const totalPages = Math.ceil(total / limit);

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>Foydalanuvchilar ({total})</h1>
            </div>

            {/* Search */}
            <form style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
                <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
                    <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#888" }} size={18} />
                    <input
                        name="q"
                        defaultValue={query}
                        placeholder="Email yoki ism orqali qidirish..."
                        style={{
                            width: "100%",
                            padding: "10px 10px 10px 36px",
                            borderRadius: "8px",
                            border: "1px solid #ddd",
                            fontSize: "14px",
                        }}
                    />
                </div>
                <button type="submit" style={{ padding: "10px 20px", background: "#0066cc", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                    Qidirish
                </button>
            </form>

            <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#f8f9fa" }}>
                        <tr>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", color: "#666", textTransform: "uppercase" }}>Foydalanuvchi</th>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", color: "#666", textTransform: "uppercase" }}>Email</th>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", color: "#666", textTransform: "uppercase" }}>Rol</th>
                            <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", color: "#666", textTransform: "uppercase" }}>Qo'shilgan sanasi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} style={{ borderBottom: "1px solid #eee" }}>
                                <td style={{ padding: "16px" }}>
                                    <Link href={`/admin/users/${user.id}`} style={{ fontWeight: "500", color: "#0066cc", textDecoration: "none" }} className="hover:underline">
                                        {user.name || "Nomsiz"}
                                    </Link>
                                </td>
                                <td style={{ padding: "16px", color: "#666" }}>{user.email}</td>
                                <td style={{ padding: "16px" }}>
                                    <span
                                        style={{
                                            padding: "4px 10px",
                                            borderRadius: "20px",
                                            fontSize: "12px",
                                            fontWeight: "500",
                                            background: user.role === "ADMIN" ? "#e6f4ff" : "#f6f6f6",
                                            color: user.role === "ADMIN" ? "#0066cc" : "#666",
                                        }}
                                    >
                                        {user.role}
                                    </span>
                                </td>
                                <td style={{ padding: "16px", color: "#999", fontSize: "14px" }}>
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "24px" }}>
                {page > 1 && (
                    <Link href={`/admin/users?page=${page - 1}&q=${query}`} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px", display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={16} /> Oldingi
                    </Link>
                )}
                <span style={{ padding: "8px 16px", color: "#666" }}>
                    Sahifa {page} / {totalPages}
                </span>
                {page < totalPages && (
                    <Link href={`/admin/users?page=${page + 1}&q=${query}`} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px", display: 'flex', alignItems: 'center' }}>
                        Keyingi <ChevronRight size={16} />
                    </Link>
                )}
            </div>
        </div>
    );
}

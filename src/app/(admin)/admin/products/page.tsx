import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import SoftDeleteButton from "./SoftDeleteButton";
import { unstable_cache } from "next/cache";

const getProducts = unstable_cache(
    async (skip: number, take: number) => {
        return await Promise.all([
            (prisma as any).product.findMany({
                where: { isDeleted: false },
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
            (prisma as any).product.count({ where: { isDeleted: false } }),
        ]);
    },
    ['admin-products-list'],
    { tags: ['products'] }
);

export default async function AdminProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const params = await searchParams;
    const pageParam = parseInt(params.page || "1");
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = 12;
    const skip = (page - 1) * limit;

    const [products, total] = await getProducts(skip, limit);

    const totalPages = Math.ceil(total / limit);

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>Mahsulotlar ({total})</h1>
                <Link href="/admin/products/new" style={{ background: "#0066cc", color: "#fff", padding: "10px 20px", borderRadius: "8px", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", fontWeight: "500" }}>
                    <Plus size={18} /> Yangi mahsulot
                </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
                {products.map((product: any) => (
                    <div key={product.id} style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", border: "1px solid #eee", display: "flex", flexDirection: "column" }}>
                        <div style={{ paddingTop: "75%", position: "relative", background: "#f8f8f8" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={product.image || "https://placehold.co/400"}
                                alt={product.title}
                                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", padding: "10px" }}
                            />
                            {product.stock <= 0 && (
                                <div style={{ position: 'absolute', top: 10, right: 10, background: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                    TUGAGAN
                                </div>
                            )}
                            <div style={{ position: 'absolute', bottom: 10, left: 10, background: product.status === 'ACTIVE' ? '#22c55e' : '#f59e0b', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                                {product.status}
                            </div>
                        </div>
                        <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
                            <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px", lineHeight: "1.4", height: '44px', overflow: 'hidden' }}>{product.title}</div>
                            <div style={{ fontSize: "14px", color: "#666", marginBottom: "12px", flex: 1 }}>{product.price.toLocaleString()} so'm</div>

                            <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                                <Link href={`/admin/products/${product.id}`} style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #ddd", background: "none", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "4px", textDecoration: "none", color: "inherit" }}>
                                    <Edit size={16} /> <span style={{ fontSize: '13px' }}>Tahrirlash</span>
                                </Link>
                                <SoftDeleteButton productId={product.id} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "24px" }}>
                {page > 1 && (
                    <Link href={`/admin/products?page=${page - 1}`} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px", display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={16} />
                    </Link>
                )}
                <span style={{ padding: "8px 16px", color: "#666" }}>
                    Sahifa {page} / {totalPages || 1}
                </span>
                {page < totalPages && (
                    <Link href={`/admin/products?page=${page + 1}`} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px", display: 'flex', alignItems: 'center' }}>
                        <ChevronRight size={16} />
                    </Link>
                )}
            </div>
        </div>
    );
}

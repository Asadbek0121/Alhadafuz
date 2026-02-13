import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Package, Tag, AlertCircle } from "lucide-react";
import SoftDeleteButton from "./SoftDeleteButton";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const getProducts = async (skip: number, take: number, vendorId?: string, query?: string) => {
    try {
        let hasVendorId = false;

        // 1. Determine DB type and check for vendorId column
        try {
            const columns: any[] = await (prisma as any).$queryRawUnsafe(`
                SELECT column_name FROM information_schema.columns WHERE table_name = 'Product'
            `);
            hasVendorId = columns.some(c => c.column_name === 'vendorId');
        } catch (pgError) {
            // Probably not Postgres or permission issue, try SQLite fallback
            try {
                const tableInfo: any[] = await (prisma as any).$queryRawUnsafe(`PRAGMA table_info("Product")`);
                hasVendorId = tableInfo.some(c => c.name === 'vendorId');
            } catch (sqliteError) {
                // Total fallback: assume false if we can't check
                hasVendorId = false;
            }
        }

        // 2. Build where clause for Prisma ORM (non-raw query path)
        const where: any = { isDeleted: false };
        if (vendorId && hasVendorId) {
            where.vendorId = vendorId;
        }
        if (query) {
            where.title = { contains: query, mode: 'insensitive' };
        }

        // 3. Query based on detected schema and vendorId
        // We use queryRaw for vendor specific view to handle potential missing column errors better
        if (vendorId && hasVendorId) {
            try {
                const searchFilter = query ? ` AND "title" ILIKE $4 ` : '';
                const queryParams = query ? [vendorId, take, skip, `%${query}%`] : [vendorId, take, skip];

                const products = await (prisma as any).$queryRawUnsafe(`
                    SELECT * FROM "Product" 
                    WHERE "isDeleted" = false AND "vendorId" = $1 ${searchFilter}
                    ORDER BY "createdAt" DESC 
                    LIMIT $2 OFFSET $3
                `, ...queryParams);

                const countResult = await (prisma as any).$queryRawUnsafe(`
                    SELECT COUNT(*)::int as count FROM "Product" 
                    WHERE "isDeleted" = false AND "vendorId" = $1 ${searchFilter}
                `, vendorId, ...(query ? [`%${query}%`] : []));

                return [products, countResult[0]?.count || 0, false] as [any[], number, boolean];
            } catch (queryError) {
                console.error("error in raw vendor query:", queryError);
                // Fallback to prisma.findMany if raw query fails
            }
        }

        // 4. Admin view or Vendor fallback if column missing or raw query failed
        const [products, count] = await Promise.all([
            (prisma as any).product.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }).catch(() => []),
            (prisma as any).product.count({ where }).catch(() => 0)
        ]);

        return [products, count, !hasVendorId] as [any[], number, boolean];
    } catch (error) {
        console.error("CRITICAL error in getProducts:", error);
        return [[], 0, false] as [any[], number, boolean];
    }
};

import AdminProductSearch from "./AdminProductSearch";

export default async function AdminProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; q?: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect('/auth/login');

    const userRole = (session.user as any).role;
    const userId = session.user.id as string;
    const vendorId = userRole === "VENDOR" ? userId : undefined;

    const params = await searchParams;
    const pageParam = parseInt(params.page || "1");
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = 12;
    const skip = (page - 1) * limit;
    const query = params.q || "";

    const [products, total, isSchemaOutdated] = await getProducts(skip, limit, vendorId, query);

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="p-8 bg-gray-50/50 min-h-screen space-y-8">
            {isSchemaOutdated && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-4">
                    <AlertCircle className="text-amber-600 flex-shrink-0 mt-1" size={20} />
                    <div className="space-y-1">
                        <p className="font-bold text-amber-900">Ma'lumotlar bazasi sxemasi eskirgan!</p>
                        <p className="text-sm text-amber-700">
                            Sotuvchi filtrini ishlatish uchun bazani yangilash kerak.
                            Iltimos, Admin panelga kirib <Link href="/admin/db-fix" className="underline font-bold">Diagnostika</Link> sahifasida bazani tuzating.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                            <Package size={24} />
                        </div>
                        Mahsulotlar
                        <span className="text-sm font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                            {total}
                        </span>
                    </h1>
                    <p className="text-gray-500 font-medium">
                        {userRole === "VENDOR" ? "Sizning mahsulotlaringiz" : "Platformadagi barcha mahsulotlar"}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <AdminProductSearch />
                    <Link
                        href="/admin/products/new"
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 py-3 shadow-xl shadow-indigo-200/50 transition-all active:scale-95 font-black tracking-tight uppercase text-sm whitespace-nowrap"
                    >
                        <Plus size={18} strokeWidth={3} /> Yangi mahsulot
                    </Link>
                </div>
            </div>

            {products.length === 0 ? (
                <div className="bg-white rounded-[32px] p-20 border border-gray-100 text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                        <Package size={40} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-gray-900">Mahsulotlar topilmadi</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">
                            {query ? `"${query}" bo'yicha hech narsa topilmadi. Boshqa so'z bilan qidirib ko'ring.` : "Hali hech qanday mahsulot qo'shilmagan."}
                        </p>
                    </div>
                    {query && (
                        <Link href="/admin/products" className="inline-block text-indigo-600 font-bold hover:underline">
                            Qidiruvni tozalash
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product: any) => (
                        <div key={product.id} className="bg-white rounded-[24px] overflow-hidden border border-gray-100 flex flex-col group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 relative">
                            <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={product.image || "https://placehold.co/400"}
                                    alt={product.title}
                                    className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                                />

                                {/* Badges Container */}
                                <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
                                    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md ${['ACTIVE', 'PUBLISHED'].includes(product.status?.toUpperCase())
                                        ? 'bg-emerald-500 text-white'
                                        : ['INACTIVE', 'ARCHIVED'].includes(product.status?.toUpperCase())
                                            ? 'bg-red-500 text-white'
                                            : product.status?.toUpperCase() === 'SOTUVDA_KAM_QOLGAN'
                                                ? 'bg-orange-500 text-white'
                                                : ['DRAFT'].includes(product.status?.toUpperCase())
                                                    ? 'bg-gray-500 text-white'
                                                    : 'bg-gray-500 text-white' // Default case for unknown statuses
                                        }`}>
                                        {['ACTIVE', 'PUBLISHED'].includes(product.status?.toUpperCase()) ? 'Sotuvda mavjud' :
                                            ['INACTIVE', 'ARCHIVED'].includes(product.status?.toUpperCase()) ? 'Sotuvda mavjud emas' :
                                                product.status?.toUpperCase() === 'SOTUVDA_KAM_QOLGAN' ? 'Sotuvda kam qolgan' :
                                                    ['DRAFT'].includes(product.status?.toUpperCase()) ? 'Qoralama' : product.status}
                                    </div>
                                    {product.stock <= 0 && (
                                        <div className="px-2.5 py-1 rounded-lg bg-red-500/90 text-white text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md flex items-center gap-1">
                                            <AlertCircle size={10} strokeWidth={3} /> Tugagan
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2 line-clamp-2 min-h-[44px]" title={product.title}>
                                    {product.title}
                                </h3>

                                <div className="flex flex-col gap-1 mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="text-indigo-600 font-black text-xl">
                                            {product.price.toLocaleString()} <span className="text-xs font-bold text-indigo-400 uppercase">so'm</span>
                                        </div>
                                        {product.oldPrice && product.oldPrice > product.price && (
                                            <div className="text-gray-400 text-xs line-through font-bold">
                                                {product.oldPrice.toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                    {product.oldPrice && product.oldPrice > product.price && (
                                        <div className="flex items-center gap-2">
                                            <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-md border border-red-100 uppercase">
                                                -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% Chegirma
                                            </span>
                                            {product.discountType && (
                                                <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-md border border-orange-100 uppercase">
                                                    {product.discountType}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto grid grid-cols-2 gap-2">
                                    <Link
                                        href={`/admin/products/${product.id}`}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 text-gray-600 font-bold text-xs hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                    >
                                        <Edit size={14} strokeWidth={2.5} /> Tahrirlash
                                    </Link>
                                    <SoftDeleteButton productId={product.id} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-8">
                    {page > 1 && (
                        <Link
                            href={`/admin/products?page=${page - 1}${query ? `&q=${query}` : ""}`}
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
                            href={`/admin/products?page=${page + 1}${query ? `&q=${query}` : ""}`}
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

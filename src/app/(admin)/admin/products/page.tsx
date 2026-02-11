import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Package, Tag, AlertCircle } from "lucide-react";
import SoftDeleteButton from "./SoftDeleteButton";

const getProducts = async (skip: number, take: number) => {
    const products = await (prisma as any).$queryRawUnsafe(`
        SELECT * FROM "Product" 
        WHERE "isDeleted" = false 
        ORDER BY "createdAt" DESC 
        LIMIT ${take} OFFSET ${skip}
    `);

    const countResult = await (prisma as any).$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "Product" 
        WHERE "isDeleted" = false
    `);

    // Postgres returns BigInt for count, convert to Number
    const count = Number(countResult[0].count);

    return [products, count] as [any[], number];
};

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
        <div className="p-8 bg-gray-50/50 min-h-screen space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
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
                    <p className="text-gray-500 font-medium">Do'koningiz mahsulotlarini boshqarish</p>
                </div>

                <Link
                    href="/admin/products/new"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 py-3 shadow-xl shadow-indigo-200/50 transition-all active:scale-95 font-black tracking-tight uppercase text-sm"
                >
                    <Plus size={18} strokeWidth={3} /> Yangi mahsulot
                </Link>
            </div>

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

                            <div className="flex items-center gap-2 mb-4">
                                <div className="text-indigo-600 font-black text-xl">
                                    {product.price.toLocaleString()} <span className="text-xs font-bold text-indigo-400 uppercase">so'm</span>
                                </div>
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-8">
                    {page > 1 && (
                        <Link
                            href={`/admin/products?page=${page - 1}`}
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
                            href={`/admin/products?page=${page + 1}`}
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

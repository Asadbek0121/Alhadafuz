import { Link } from '@/navigation';
import { FolderOpen } from 'lucide-react';

interface CategoryCardProps {
    name: string;
    slug: string;
    image?: string | null;
}

/**
 * Bosh sahifa kategoriya tezkor-linki.
 * Server komponenti — `next/image` uchun remote pattern talab qilmaydi,
 * rasmsiz kategoriyalar uchun ikonka fallback ishlatiladi.
 */
export default function CategoryCard({ name, slug, image }: CategoryCardProps) {
    return (
        <Link
            href={`/category/${slug}`}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md"
        >
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                {image ? (
                    <img
                        src={image}
                        alt={name}
                        width={64}
                        height={64}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <FolderOpen size={28} className="text-slate-400" />
                )}
            </div>
            <span className="line-clamp-2 text-center text-xs font-bold leading-tight text-slate-700 group-hover:text-blue-600">
                {name}
            </span>
        </Link>
    );
}

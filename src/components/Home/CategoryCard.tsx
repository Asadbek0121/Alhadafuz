import { Link } from '@/navigation';
import { FolderOpen } from 'lucide-react';

interface CategoryCardProps {
    name: string;
    slug: string;
    image?: string | null;
}

/**
 * Bosh sahifa kategoriya kartasi.
 * Rasm butun kartani to'ldiradi (object-cover), nom pastda gradient fon ustida.
 */
export default function CategoryCard({ name, slug, image }: CategoryCardProps) {
    return (
        <Link
            href={`/category/${slug}`}
            className="group relative block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md"
            style={{ aspectRatio: '1 / 1' }}
        >
            {image ? (
                <img
                    src={image}
                    alt={name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                    <FolderOpen size={32} className="text-slate-400" />
                </div>
            )}
            <span className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-center px-2 pb-2 pt-10 text-center text-xs font-bold leading-tight text-white"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)' }}>
                {name}
            </span>
        </Link>
    );
}

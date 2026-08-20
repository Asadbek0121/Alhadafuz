import { Truck, CreditCard, ShieldCheck, Package } from 'lucide-react';

interface TrustItem {
    icon: typeof Truck;
    title: string;
    description: string;
}

interface TrustSectionProps {
    items: TrustItem[];
}

/**
 * "Nega HADAF?" ishonch bloki.
 * Server komponenti — faqat props orqali ma'lumot oladi, hech qanday client
 * logic yoki fetch qilmaydi. I18n ma'lumotlar server sahifadan uzatiladi.
 */
export default function TrustSection({ items }: TrustSectionProps) {
    if (items.length === 0) return null;

    return (
        <section className="bg-gradient-to-b from-slate-50 to-white py-16 md:py-24">
            <div className="container">
                <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
                    {items.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={i}
                                className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                    <Icon size={26} />
                                </div>
                                <h3 className="text-sm font-black leading-tight text-slate-900">
                                    {item.title}
                                </h3>
                                <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                                    {item.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
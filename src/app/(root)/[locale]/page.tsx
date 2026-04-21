import Hero from "@/components/Hero/Hero";
import ProductCard from "@/components/ProductCard/ProductCard";
import { getTranslations } from 'next-intl/server';
import { getCachedProducts, getCachedBanners } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Header' });
  
  // Parallel fetch on server
  const [products, banners] = await Promise.all([
    getCachedProducts(),
    getCachedBanners()
  ]);

  return (
    <div className="pb-[60px] md:pb-0">
      <Hero initialBanners={banners} />

      <section className="container">
        <h2 className="text-2xl font-bold mb-6 mt-10 text-slate-900">
          {t('ommabop_mahsulotlar')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1800px]:grid-cols-7 gap-3 md:gap-6">
          {products.map((p: any, index: number) => (
            <ProductCard
              key={p.id}
              id={p.id}
              title={p.title}
              price={p.price}
              oldPrice={p.oldPrice}
              image={p.image}
              isSale={p.isSale}
              discountType={p.discountType}
              isNew={p.isNew}
              freeDelivery={p.freeDelivery}
              hasVideo={p.hasVideo}
              hasGift={p.hasGift}
              showLowStock={p.showLowStock}
              allowInstallment={p.allowInstallment}
              stock={p.stock}
              priority={index < 8}
            />
          ))}
        </div>
      </section>
    </div>
  );
}


import Hero from "@/components/Hero/Hero";
import ProductCard from "@/components/ProductCard/ProductCard";
import ViewMoreButton from "@/components/Home/ViewMoreButton";
import CategoryCard from "@/components/Home/CategoryCard";
import { getTranslations } from 'next-intl/server';
import { getCachedHomepageProducts, getCachedBanners, getCachedFlashDeals, getCachedRootCategories } from '@/lib/data';
import type { Metadata } from 'next';
import { translatedPageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return translatedPageMetadata('home', { locale, path: '', absoluteTitle: true });
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Header' });

  // Parallel server-side fetch — barcha cached, 3600s revalidation.
  // Yangi cached funksiyalar qo'shilgan: kategoriyalar va chegirmali mahsulotlar.
  // `allSettled`: bitta cached funksiya transient DB xatosi tufayli throw qilsa
  // (endi keshga [] saqlanmaydi), qolgan bo'limlar ishlashda davom etadi va
  // homepage 500 bermaydi. Xato bo'lgan bo'lim shu so'rovda bo'sh ko'rinadi,
  // keyingi so'rovda qayta uriniladi.
  const [products, banners, categories, flashDeals] = await Promise.allSettled([
    getCachedHomepageProducts(24),
    getCachedBanners(),
    getCachedRootCategories(),
    getCachedFlashDeals(8),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])));

  return (
    <div className="pb-[60px] md:pb-0">
      <Hero initialBanners={banners} fallbackProducts={products} />

      {/* Kategoriya tezkor-linklari — faqat real data mavjud bo'lsa ko'rsatiladi.
          Mobile'da yashirin — kategoriyalar Katalog (MegaMenu) ichida bor. */}
      {categories.length > 0 && (
        <section className="container hidden py-6 md:py-10 md:block">
          <h2 className="mb-4 text-lg font-black uppercase tracking-wider text-slate-900 md:mb-6 md:text-xl">
            {t('kategoriyalar')}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar md:grid md:grid-cols-4 md:gap-4 lg:grid-cols-6 xl:grid-cols-8">
            {categories.map((cat: any) => (
              <CategoryCard key={cat.id} name={cat.name} slug={cat.slug} image={cat.image} />
            ))}
          </div>
        </section>
      )}

      {/* Flash Deals — chegirmali mahsulotlar, faqat real discount mavjud bo'lsa */}
      {flashDeals.length > 0 && (
        <section className="container pb-6 md:pb-10">
          <h2 className="mb-4 text-lg font-black uppercase tracking-wider text-slate-900 md:mb-6 md:text-xl">
            {t('chegirmalar')}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {flashDeals.map((p: any, index: number) => (
              <div key={p.id} className="w-52 shrink-0 md:w-auto">
                <ProductCard
                  id={p.id}
                  slug={p.slug}
                  title={p.title}
                  price={p.price}
                  oldPrice={p.oldPrice}
                  image={p.image}
                  discount={p.discount}
                  discountType={p.discountType}
                  isNew={p.isNew}
                  freeDelivery={p.freeDelivery}
                  hasVideo={p.hasVideo}
                  hasGift={p.hasGift}
                  showLowStock={p.showLowStock}
                  allowInstallment={p.allowInstallment}
                  stock={p.stock}
                  rating={p.rating}
                  reviewCount={p.reviewsCount}
                  fulfillmentType={p.fulfillmentType}
                  priority={false}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ommabop mahsulotlar — asosiy h1 bo'limi */}
      <section className="container pb-8 md:pb-12">
        <h1 className="text-2xl font-bold mb-6 mt-10 text-slate-900">
          {t('ommabop_mahsulotlar')}
        </h1>
        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1800px]:grid-cols-7 gap-3 md:gap-6">
              {products.map((p: any, index: number) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  slug={p.slug}
                  title={p.title}
                  price={p.price}
                  oldPrice={p.oldPrice}
                  image={p.image}
                  discount={p.discount}
                  discountType={p.discountType}
                  isNew={p.isNew}
                  freeDelivery={p.freeDelivery}
                  hasVideo={p.hasVideo}
                  hasGift={p.hasGift}
                  showLowStock={p.showLowStock}
                  allowInstallment={p.allowInstallment}
                  stock={p.stock}
                  rating={p.rating}
                  reviewCount={p.reviewsCount}
                  fulfillmentType={p.fulfillmentType}
                  priority={index < 8}
                />
              ))}
            </div>
            <ViewMoreButton />
          </>
        ) : (
          <p className="text-slate-500 font-medium text-center py-12">{t('not_found')}</p>
        )}
      </section>

    </div>
  );
}


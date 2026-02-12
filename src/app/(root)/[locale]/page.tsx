"use client";

import { useEffect, useState } from 'react';
import Hero from "@/components/Hero/Hero";
import ProductCard from "@/components/ProductCard/ProductCard";
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  image: string;
  link?: string;
}

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const t = useTranslations('Header');

  useEffect(() => {
    // Fetch products
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error("Products API returned non-array:", data);
          setProducts([]);
        }
      })
      .catch(err => console.error(err));

    // Fetch HOME_TOP banners
    fetch('/api/admin/banners')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const now = new Date();
          const homeTopBanners = data.filter((b: any) => {
            // Check if active
            if (!b.isActive || b.position !== 'HOME_TOP') return false;

            // Check scheduling
            if (b.startDate && new Date(b.startDate) > now) return false;
            if (b.endDate && new Date(b.endDate) < now) return false;

            return true;
          });
          setBanners(homeTopBanners);

          // Track impressions
          homeTopBanners.forEach((banner: any) => {
            fetch(`/api/admin/banners/${banner.id}/impression`, { method: 'POST' })
              .catch(err => console.error('Failed to track impression:', err));
          });
        }
      })
      .catch(err => console.error('Failed to fetch banners:', err));
  }, []);

  // Auto-scroll banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const nextBanner = () => {
    setCurrentBanner(prev => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length);
  };

  return (
    <main style={{ paddingBottom: '60px' }}>
      <Hero />

      {/* Banners Carousel */}
      {banners.length > 0 && (
        <section className="container mx-auto px-4 mt-8">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl group">
            <div className="relative h-[200px] md:h-[300px] lg:h-[400px]">
              {banners.map((banner, index) => {
                const BannerContent = (
                  <div
                    className={`absolute inset-0 transition-opacity duration-700 ${index === currentBanner ? 'opacity-100' : 'opacity-0'
                      }`}
                    style={{ pointerEvents: index === currentBanner ? 'auto' : 'none' }}
                  >
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                    {banner.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 md:p-8">
                        <h3 className="text-white text-xl md:text-3xl font-bold drop-shadow-lg">
                          {banner.title}
                        </h3>
                      </div>
                    )}
                  </div>
                );

                const handleBannerClick = () => {
                  if (banner.link) {
                    fetch(`/api/admin/banners/${banner.id}/click`, { method: 'POST' })
                      .catch(err => console.error('Failed to track click:', err));
                  }
                };

                return banner.link ? (
                  <Link key={banner.id} href={banner.link} onClick={handleBannerClick}>
                    {BannerContent}
                  </Link>
                ) : (
                  <div key={banner.id}>{BannerContent}</div>
                );
              })}
            </div>

            {/* Navigation Arrows */}
            {banners.length > 1 && (
              <>
                <button
                  onClick={prevBanner}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 md:p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                  aria-label="Previous banner"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextBanner}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 md:p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                  aria-label="Next banner"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            {banners.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentBanner(index)}
                    className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${index === currentBanner
                      ? 'bg-white w-6 md:w-8'
                      : 'bg-white/50 hover:bg-white/75'
                      }`}
                    aria-label={`Go to banner ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="container">
        <h2 className="text-2xl font-bold mb-6 mt-10 text-slate-900">
          {t('ommabop_mahsulotlar')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1800px]:grid-cols-7 gap-3 md:gap-6">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              title={p.title}
              price={p.price}
              oldPrice={p.oldPrice}
              image={p.image}
              isSale={p.isSale}
            />
          ))}
        </div>
      </section>
    </main >
  );
}

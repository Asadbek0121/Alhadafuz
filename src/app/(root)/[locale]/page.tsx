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
              discountType={p.discountType}
              isNew={p.isNew}
              freeDelivery={p.freeDelivery}
              hasVideo={p.hasVideo}
              hasGift={p.hasGift}
              showLowStock={p.showLowStock}
              allowInstallment={p.allowInstallment}
              stock={p.stock}
            />
          ))}
        </div>
      </section>
    </main >
  );
}

"use client";
// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute
// Force recompile due to Turbopack error

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
  const [isMounted, setIsMounted] = useState(false);
  const t = useTranslations('Header');
  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
    setIsMounted(true);
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
  }, []);

  if (!isMounted) return null;

  return (
    <div className="pb-[60px] md:pb-0">
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
    </div>
  );
}

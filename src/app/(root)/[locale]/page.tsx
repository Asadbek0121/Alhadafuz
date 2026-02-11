"use client";

import { useEffect, useState } from 'react';
import Hero from "@/components/Hero/Hero";
import ProductCard from "@/components/ProductCard/ProductCard";
import { useTranslations } from 'next-intl';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const t = useTranslations('Header');

  useEffect(() => {
    fetch('/api/products')
      // ... (keep fetch logic, just skipped in replacement for brevity if tools allow, but standard tool replaces block)
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
            />
          ))}
        </div>
      </section>
    </main >
  );
}

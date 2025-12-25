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
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', marginTop: '40px' }}>
          {t('ommabop_mahsulotlar')}
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          {products.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              title={p.title}
              price={p.price}
              oldPrice={p.originalPrice}
              image={p.image}
              isSale={p.isSale}
            />
          ))}
        </div>
      </section>
    </main >
  );
}

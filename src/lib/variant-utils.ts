export function parseVariantKey(variantKey: string): Record<string, string> {
  const opts: Record<string, string> = {};
  if (!variantKey) return opts;
  // Ikkala formatni tan oladi:
  // 1) pipe (edit yo'li yozadi): "rang=qora|olcham=xl"
  // 2) JSON (eski atomic create yo'li yozgan): '{"Rang":"Qora"}'
  if (variantKey.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(variantKey);
      for (const [k, v] of Object.entries(parsed)) {
        const key = String(k).trim();
        const val = String(v).trim();
        if (key && val) opts[key] = val;
      }
      return opts;
    } catch { /* JSON emas — pipe formatga tushadi */ }
  }
  const parts = variantKey.split('|');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k && v) opts[k] = v;
  }
  return opts;
}

export function parseVariantOptions(variant: { variantKey: string; variantLabel?: string | null }): Record<string, string> {
  const opts = parseVariantKey(variant.variantKey || '');
  if (variant.variantLabel && Object.keys(opts).length > 0) {
    const labels = variant.variantLabel.split(' / ');
    const keys = Object.keys(opts);
    if (labels.length === keys.length) {
      keys.forEach((k, i) => { opts[k] = labels[i].trim(); });
    }
  }
  return opts;
}

export function buildVariantAxes(variants: any[]): { key: string; values: string[] }[] {
  const axisMap = new Map<string, Set<string>>();
  for (const v of variants) {
    const opts = parseVariantOptions(v);
    for (const [k, val] of Object.entries(opts)) {
      if (!axisMap.has(k)) axisMap.set(k, new Set());
      axisMap.get(k)!.add(val);
    }
  }
  return Array.from(axisMap.entries())
    .map(([key, values]) => ({ key, values: Array.from(values) }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

export function findVariantByOptions(variants: any[], selectedOptions: Record<string, string>): any | null {
  if (!variants || variants.length === 0) return null;
  const target = Object.entries(selectedOptions)
    .map(([k, v]) => [k.trim(), v.trim().toLowerCase()] as const)
    .filter(([k, v]) => k.length > 0 && v.length > 0);
  if (target.length === 0) return null;
  // variantKey formati (pipe yoki JSON) farq qilmaydi — parse qilib,
  // case-insensitive object solishtirish orqali topiladi.
  return variants.find((v: any) => {
    const opts = parseVariantKey(v.variantKey || '');
    return target.every(([k, val]) => (opts[k] || '').trim().toLowerCase() === val);
  }) || null;
}

export function variantPrice(variant: any, productPrice: number): number {
  return variant && variant.price !== 0 ? variant.price : productPrice;
}

export function variantStock(variant: any, productStock: number): number {
  return variant && variant.stock !== -1 ? variant.stock : productStock;
}

export function variantImages(variant: any, productImages: string[]): string[] {
  if (variant && variant.images && variant.images.length > 0) {
    return variant.images.map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean);
  }
  return productImages;
}

export function getAvailableOptions(
  variants: any[],
  axisKey: string,
  selectedOptions: Record<string, string>,
): Set<string> {
  const available = new Set<string>();
  for (const v of variants) {
    const opts = parseVariantOptions(v);
    // Bu variant tanlangan barcha boshqa o'qlarga mos keladimi?
    let matches = true;
    for (const [k, selectedVal] of Object.entries(selectedOptions)) {
      if (k === axisKey) continue; // hozirgi o'qni tekshirmaymiz
      if (opts[k]?.toLowerCase() !== selectedVal.toLowerCase()) {
        matches = false;
        break;
      }
    }
    if (matches && opts[axisKey]) {
      available.add(opts[axisKey]);
    }
  }
  return available;
}

export function variantFulfillment(variant: any, productFulfillment?: string): string | undefined {
  return variant && variant.fulfillmentType ? variant.fulfillmentType : productFulfillment;
}
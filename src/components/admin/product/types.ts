export interface AttributeDef {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string | null;
  unit: string | null;
  allowedUnits: string | null;
  minValue: number | null;
  maxValue: number | null;
  forVariant: boolean;
  order: number;
  isActive: boolean;
  visibleWhen: string | null;
  requiredWhen: string | null;
  dependsOn: string | null;
}

/** GET /api/admin/products/[id]/attributes javobidagi satr — def + qiymat. */
export interface ProductAttributeRow extends AttributeDef {
  value?: unknown;
}

export interface AttributeExtraValue {
  attributeDefId: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string | null;
  unit: string | null;
  allowedUnits: string | null;
  minValue: number | null;
  maxValue: number | null;
  forVariant: boolean;
  order: number;
  value?: unknown;
}

export interface VariantImageItem {
  id?: string;
  url: string;
  order: number;
  isPrimary: boolean;
}

export interface VariantRow {
  key: string;
  options: Record<string, string>;
  label: string;
  sku: string;
  barcode: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  weight: string;
  isDefault: boolean;
  isActive: boolean;
  images: VariantImageItem[];
  id?: string;
}

export interface VariantAxis {
  defId: string;
  name: string;
  label: string;
  values: string[];
}

export function parseVariantKey(key: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of key.split('|')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}
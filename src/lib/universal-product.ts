import { z } from 'zod'

export const FULFILLMENT_TYPES = ['LOCAL', 'CHINA_ORDER'] as const
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number]

export const ATTRIBUTE_TYPES = [
  'TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'COLOR', 'MEASUREMENT', 'DATE',
] as const
export type AttributeType = (typeof ATTRIBUTE_TYPES)[number]

export const VALID_HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const attributeDefSchema = z.object({
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.enum(ATTRIBUTE_TYPES).default('TEXT'),
  required: z.boolean().default(false),
  options: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  allowedUnits: z.string().nullable().optional(),
  minValue: z.coerce.number().nullable().optional(),
  maxValue: z.coerce.number().nullable().optional(),
  forVariant: z.boolean().default(false),
  order: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

// PATCH uchun — default'lar qo'llanmaydi (`.partial()` default'li schema'da
// `required:false`/`order:0` kabi default'larni yuborilgan deb hisoblardi).
export const attributeDefPatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  label: z.string().min(1).max(200).optional(),
  type: z.enum(ATTRIBUTE_TYPES).optional(),
  required: z.boolean().optional(),
  options: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  allowedUnits: z.string().nullable().optional(),
  minValue: z.coerce.number().nullable().optional(),
  maxValue: z.coerce.number().nullable().optional(),
  forVariant: z.boolean().optional(),
  order: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const variantBodySchema = z.object({
  options: z.record(z.string(), z.string()).optional(),
  variantKey: z.string().optional(),
  variantLabel: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  price: z.coerce.number().nonnegative().default(0),
  compareAtPrice: z.coerce.number().nonnegative().nullable().optional(),
  stock: z.coerce.number().int().default(-1),
  weight: z.coerce.number().nonnegative().nullable().optional(),
  fulfillmentType: z.enum(FULFILLMENT_TYPES).nullable().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

// PATCH uchun alohida schema — default'lar bo'lmagan (faqat berilgan maydonlar
// yangilanadi; `.partial()` default'li schema'da default'larni qaytarardi).
export const variantPatchSchema = z.object({
  options: z.record(z.string(), z.string()).optional(),
  variantKey: z.string().optional(),
  variantLabel: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  price: z.coerce.number().nonnegative().optional(),
  compareAtPrice: z.coerce.number().nonnegative().nullable().optional(),
  stock: z.coerce.number().int().optional(),
  weight: z.coerce.number().nonnegative().nullable().optional(),
  fulfillmentType: z.enum(FULFILLMENT_TYPES).nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export function parseOptions(options?: string | null): string[] {
  if (!options) return []
  return options.split(',').map(o => o.trim()).filter(Boolean)
}

export function validateDefinitionTypeCombo(
  type: string,
  options: string | null | undefined,
  unit: string | null | undefined,
  minValue: number | null | undefined,
  maxValue: number | null | undefined,
): string | null {
  const opts = parseOptions(options)
  switch (type) {
    case 'TEXT':
    case 'BOOLEAN':
    case 'DATE':
      if (opts.length > 0) return `${type} tipida options bo'lmasligi kerak`
      if (minValue != null || maxValue != null) return `${type} tipida min/max bo'lmasligi kerak`
      break
    case 'NUMBER':
      if (opts.length > 0) return 'NUMBER tipida options bo\'lmasligi kerak'
      break
    case 'SELECT':
    case 'MULTI_SELECT':
      if (opts.length === 0) return `${type} tipida kamida 1 ta options bo'lishi shart`
      break
    case 'COLOR':
      if (opts.length > 0 && opts.some(o => !VALID_HEX_COLOR.test(o))) {
        return 'COLOR optionslari #HEX formatida (masalan #FF0000) bo\'lishi kerak'
      }
      break
    case 'MEASUREMENT':
      if (opts.length > 0) return 'MEASUREMENT tipida options bo\'lmasligi kerak'
      break
  }
  if ((type === 'NUMBER' || type === 'MEASUREMENT') && minValue != null && maxValue != null && minValue > maxValue) {
    return 'minValue maxValue dan katta bo\'la olmaydi'
  }
  return null
}

export function normalizeVariantValue(v: string): string {
  return v.trim().toLowerCase()
}

export function buildVariantKey(options: Record<string, string>): string {
  const entries = Object.entries(options)
    .map(([k, v]) => [k.trim(), normalizeVariantValue(v)] as const)
    .filter(([k, v]) => k.length > 0 && v.length > 0)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  return entries.map(([k, v]) => `${k}=${v}`).join('|')
}

export function buildVariantLabel(options: Record<string, string>): string {
  // Kalitlar lexicographic sort — variantKey bilan bir xil tartib,
  // shunda label ham kanonik tartibda chiqadi.
  const sorted = Object.entries(options)
    .filter(([k, v]) => k.trim().length > 0 && v.trim().length > 0)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  return sorted.map(([, v]) => v.trim()).join(' / ')
}

export function validateAttributeValue(
  def: { type: string; required: boolean; options?: string | null; minValue?: number | null; maxValue?: number | null; label: string },
  rawValue: unknown,
): string | null {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    if (def.required) return `${def.label} qiymati shart`
    return null
  }
  switch (def.type) {
    case 'TEXT':
      if (typeof rawValue !== 'string') return `${def.label} — TEXT string bo'lishi kerak`
      return null
    case 'NUMBER': {
      const n = Number(rawValue)
      if (!Number.isFinite(n)) return `${def.label} — NUMBER raqam bo'lishi kerak`
      if (def.minValue != null && n < def.minValue) return `${def.label} qiymati ${def.minValue} dan kam bo'la olmaydi`
      if (def.maxValue != null && n > def.maxValue) return `${def.label} qiymati ${def.maxValue} dan oshib keta olmaydi`
      return null
    }
    case 'BOOLEAN':
      if (typeof rawValue === 'boolean') return null
      if (rawValue === 'true' || rawValue === 'false') return null
      return `${def.label} — BOOLEAN true/false bo'lishi kerak`
    case 'SELECT': {
      const opts = parseOptions(def.options)
      const s = String(rawValue).trim()
      if (!opts.map(o => o.toLowerCase()).includes(s.toLowerCase())) {
        return `${def.label} — SELECT qiymati (${s}) optionslardan biri emas: ${opts.join(', ')}`
      }
      return null
    }
    case 'MULTI_SELECT': {
      const arr = Array.isArray(rawValue) ? rawValue.map(String) : [String(rawValue)]
      const opts = parseOptions(def.options)
      const optsLower = opts.map(o => o.toLowerCase())
      for (const v of arr) {
        if (!optsLower.includes(v.trim().toLowerCase())) {
          return `${def.label} — MULTI_SELECT qiymati (${v}) optionslardan biri emas: ${opts.join(', ')}`
        }
      }
      return null
    }
    case 'COLOR':
      return VALID_HEX_COLOR.test(String(rawValue).trim())
        ? null
        : `${def.label} — COLOR #HEX formatida bo'lishi kerak`
    case 'MEASUREMENT': {
      if (typeof rawValue === 'object' && rawValue !== null && !Array.isArray(rawValue)) {
        const n = Number((rawValue as Record<string, unknown>).value)
        if (!Number.isFinite(n)) return `${def.label} — MEASUREMENT value raqam bo'lishi kerak`
        return null
      }
      return `${def.label} — MEASUREMENT {"value": ..., "unit": "..."} ko'rinishida bo'lishi kerak`
    }
    case 'DATE': {
      const s = String(rawValue).trim()
      const d = new Date(s)
      if (isNaN(d.getTime())) return `${def.label} — DATE yaroqli sana bo'lishi kerak`
      return null
    }
    default:
      return `${def.label} — noma'lum attribute type: ${def.type}`
  }
}

export function serializeAttributeValue(type: string, rawValue: unknown): string {
  switch (type) {
    case 'NUMBER':
      return String(Number(rawValue))
    case 'BOOLEAN':
      return String(Boolean(rawValue))
    case 'MULTI_SELECT':
      return JSON.stringify(Array.isArray(rawValue) ? rawValue : [rawValue])
    case 'MEASUREMENT':
      return JSON.stringify(rawValue)
    case 'DATE': {
      const d = new Date(String(rawValue))
      return d.toISOString().slice(0, 10)
    }
    default:
      return String(rawValue)
  }
}

export function deserializeAttributeValue(type: string, stored: string): unknown {
  switch (type) {
    case 'NUMBER':
      return Number(stored)
    case 'BOOLEAN':
      return stored === 'true'
    case 'MULTI_SELECT':
    case 'MEASUREMENT':
      try { return JSON.parse(stored) } catch { return stored }
    default:
      return stored
  }
}

/**
 * CHINA_ORDER ziddiyat qoidasi.
 *
 * - Product.fulfillmentType authoritative (default LOCAL).
 * - Variant.fulfillmentType null bo'lsa → product'dan inherit qiladi.
 * - Variant.fulfillmentType override qila oladi, LEKIN: product CHINA_ORDER
 *   bo'lsa variant LOCAL bo'la olmaydi (product darajasidagi Xitoydan
 *   sourcing barcha variantlarga taalluqli).
 * - Product LOCAL bo'lsa variant CHINA_ORDER bo'lishi mumkin (per-variant
 *   override ruxsat etilgan).
 *
 * @returns error string yoki null (rulxat berilgan).
 */
export function resolveFulfillmentConflict(
  productFulfillment: string | null | undefined,
  variantFulfillment: string | null | undefined,
): string | null {
  const productF = productFulfillment === 'CHINA_ORDER' ? 'CHINA_ORDER' : 'LOCAL'
  const variantF = variantFulfillment == null ? productF : (variantFulfillment === 'CHINA_ORDER' ? 'CHINA_ORDER' : 'LOCAL')

  if (variantF === 'LOCAL' && productF === 'CHINA_ORDER') {
    return 'Product CHINA_ORDER bo\'lsa variant LOCAL bo\'la olmaydi'
  }
  return null
}

export function effectiveFulfillment(
  productFulfillment: string | null | undefined,
  variantFulfillment: string | null | undefined,
): FulfillmentType {
  const productF = productFulfillment === 'CHINA_ORDER' ? 'CHINA_ORDER' : 'LOCAL'
  const variantF = variantFulfillment == null ? productF : (variantFulfillment === 'CHINA_ORDER' ? 'CHINA_ORDER' : 'LOCAL')
  return variantF as FulfillmentType
}
# UI Audit Fixes — 2026-10-19

## Bajarilgan ishlarnm:

### 1. Inline Styles → Tailwind Classes (4 ta)
| Fayl | O'zgarish |
|------|-----------|
| `CategoryCard.tsx` | `aspect-ratio: '1/1'` → `aspect-square` |
| `CategoryCard.tsx` | gradient inline style → `bg-gradient-to-t from-black/75 to-transparent` |
| `NotificationDrawer.tsx` | `marginBottom: 24` → `mb-6` (2 joyda) |
| `NotificationDrawer.tsx` | text inline style → `text-gray-500 text-sm max-w-[260px] leading-relaxed mx-auto` |
| `CartDrawer.tsx` | `objectFit: 'contain'` → `object-contain` |
| `CategoryContent.tsx` | `textDecoration: 'none'` → `no-underline` |

### 2. Duplicate className Fixed
- `CategoryCard.tsx`: ikkita `className` prop bitta qatorga birlashtirildi
- `CategoryContent.tsx`: `className={styles.cardSub} className="no-underline"` → `${styles.cardSub} no-underline`

### 3. i18n Fixed
- `added_to_cart` kaliti `uz/ru/en` JSON fayllarga qo'shildi
- Hardcoded English fallback olib tashlandi (`profile/orders/page.tsx`)

### 4. Empty alt Attributes (dekorativ rasmlar)
Quyidagi rasmlar dekorativ, shuning uchun `alt=""` to'g'ri:
- `/icons/no-messages.svg` — NotificationDrawer
- `/icons/empty-cart.svg` — CartDrawer  
- Variant editor rasmlari — admin panel
- Invoice QR kodlari

### Qolgan (xavfsiz, user-facing emas):
- **Console.error** (15 ta) — faqat developer log, foydalanuvchiga ko'rinmaydi
- **Functional inline styles** — `display: none` (hidden inputs), `pointer-events` (carousel), loader styles
- **Hardcoded placeholders** — password fields ("********"), phone format ("+998 ___-__-__") — bu standard patterns

## Verification:
- `tsc --noEmit` ✅
- `eslint` ✅
- 6 ta commit push qilindi

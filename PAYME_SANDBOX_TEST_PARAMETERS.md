# Payme Sandbox — Test Parametrlari (Aniq)

**Endpoint:** `POST https://www.alhadaf.uz/api/payment/payme`  
**Sandbox Auth (Base64):** `UGF5Y29tOkNGWiVWdHU1YUhjUDFIOTY3Vkltc3JLTlFRQHpGczdnWUNTSw==`  
**Production Auth (Base64):** `UGF5Y29tOlRtcnAveW53K3NjQlVGMnlBNTJQQUFBQUE9`  
**PaymentMethod ID:** `cmuy1y312000n8vuh7590mwu3`

---

## 1. Bazadagi Hozirgi Holat (SELECT natijasi)

```sql
-- Barcha test buyurtmalar:
TEST_SANDBOX_001  | id: cmvai9shr0001cuy1gbvxzsuw | total: 500   | status: AWAITING_PAYMENT | txId: 6ad1b1808d84b820a3b84665 | Invoice: YO'Q
TEST_PAYME_001    | id: test_payme_001            | total: 500   | status: AWAITING_PAYMENT | txId: 6ad258458d84b820a3b84876 | Invoice: ISSUED ⚠️
TEST_PAYME_002    | id: test_payme_002            | total: 500   | status: PAYMENT_CANCELLED| txId: tx_prod_002               | Invoice: YO'Q
TEST_PAYME_003    | id: test_payme_003            | total: 500   | status: PAID             | txId: tx_prod_003               | Invoice: ISSUED ✅
TEST_PAYME_004    | id: test_payme_004            | total: 500   | status: PAYMENT_CANCELLED| txId: tx_deploy_test            | Invoice: ISSUED ⚠️
TEST_PAYME_005    | id: test_payme_005            | total: 1000  | status: PAYMENT_CANCELLED| txId: tx_005                    | Invoice: ISSUED ⚠️
```

**⚠️ MUHIM:** Barcha test buyurtmalar **dirty** (oldingi sessiyalarda ishlatilgan).  
**Toza buyurtma yo'q** (AWAITING_PAYMENT + null txId + no invoice).

| Buyurtma | To'liq toza? | Tugallangan? | Eslatma |
|----------|--------------|------------|---------|
| TEST_SANDBOX_001 | ❌ (eski txId bor) | ✅ | Eng qulay — invoice yo'q |
| TEST_PAYME_001 | ❌ (eski txId + invoice nomuvofiq) | ⚠️ | Invoice ISSUED lekin order to'lanmagan |
| TEST_PAYME_002 | ❌ | ✅ | CANCELLED, qayta yaratish mumkin |
| TEST_PAYME_003 | ❌ | ✅ | PAID, to'liq tugallangan |
| TEST_PAYME_004 | ❌ | ✅ | CANCELLED, lekin invoice ISSUED (nomuvofiq) |
| TEST_PAYME_005 | ❌ | ✅ | CANCELLED, lekin invoice ISSUED (nomuvofiq) |

**Xulosa:** `TEST_SANDBOX_001` eng qulay variant — faqat eski txId bor, lekin invoice yo'q.

---

## 2. Har Bir Test Uchun Parametrlar

### 1. Инструкция

| Maydon | Qiymat |
|--------|--------|
| Sandbox bo'limi | Инструкция |
| URL | `https://developer.help.paycom.uz/` |
| Boshlang'ich holat | — |
| Kutilgan javob | Hujjatlar sahifasi ochiladi |
| Xavf | ⚪ Xavfsiz |

---

### 2. Неверная авторизация

| Maydon | Qiymat |
|--------|--------|
| Sandbox bo'limi | Неверная авторизация |
| `account.order_id` | `TEST_PAYME_001` |
| `amount` | `50000` |
| Authorization | **NOTO'G'RI**: `UGF5Y29tOnd6b25ncGFzc3dvcmQ=` |
| Boshlang'ich holat | Order AWAITING_PAYMENT |
| Kutilgan javob | `{"error":{"code":-32504,"message":"Insufficient privileges for method execution","data":[]}}` |
| Xavf | ⚪ Xavfsiz |

---

### 3. Неверная сумма

| Maydon | Qiymat |
|--------|--------|
| Sandbox bo'limi | Неверная сумма |
| `account.order_id` | `TEST_PAYME_001` |
| `amount` | `99999` (noto'g'ri, to'g'ri: 50000) |
| Authorization | To'g'ri sandbox auth |
| Boshlang'ich holat | Order total = 500 som = 50000 tiyin |
| Kutilgan javob | `{"error":{"code":-31001,"message":"Invalid amount","data":[{"field":"amount"}]}}` |
| Xavf | ⚪ Xavfsiz |

---

### 4. Несуществующий счет

| Maydon | Qiymat |
|--------|--------|
| Sandbox bo'limi | Несуществующий счет |
| `account.order_id` | `TEST_NOT_EXIST_999` (bazada yo'q) |
| `amount` | `50000` |
| Authorization | To'g'ri sandbox auth |
| Boshlang'ich holat | — |
| Kutilgan javob | `{"error":{"code":-31099,"message":"Account not found","data":[{"field":"account.order_id"}]}}` |
| Xavf | ⚪ Xavfsiz |

---

### 5. CheckPerformTransaction ✅

| Maydon | Qiymat |
|--------|--------|
| Sandbox bo'limi | CheckPerformTransaction |
| `account.order_id` | `TEST_PAYME_001` |
| `amount` | `50000` |
| Authorization | To'g'ri sandbox auth |
| Boshlang'ich holat | Order AWAITING_PAYMENT, isTest=true |
| Kutilgan javob | `{"result":{"allow":true}}` |
| Xavf | ⚪ Xavfsiz (faqat o'qish) |

**Muqobil:** `TEST_SANDBOX_001` ham ishlatish mumkin.

---

### 6. CreateTransaction ⚠️

| Maydon | Qiymat |
|--------|--------|
| Sandbox bo'limi | CreateTransaction |
| `account.order_id` | `TEST_PAYME_001` |
| `amount` | `50000` |
| `id` | `tx_sandbox_001` (yangi random ID) |
| `time` | `1792172400000` (hozirgi timestamp) |
| Authorization | To'g'ri sandbox auth |
| Boshlang'ich holat | Order AWAITING_PAYMENT, eski txId=6ad258458d84b820a3b84876 |
| Kutilgan javob | `{"result":{"create_time":1792172400000,"transaction":"tx_sandbox_001","state":1}}` |
| Xavf | 🟡 O'rtacha — order `paymeTransactionId` yangilanadi, PaymentLog yoziladi |

**Eslatma:** Eski txId (`6ad25845...`) o'rniga yangi `tx_sandbox_001` qo'yiladi.

---

### 7. PerformTransaction ⚠️

| Maydon | Qiymat |
|--------|--------|
| Sandbox bo'limi | PerformTransaction |
| `id` | `tx_sandbox_001` (CreateTransaction dan qaytgan ID) |
| Authorization | To'g'ri sandbox auth |
| Boshlang'ich holat | Order AWAITING_PAYMENT, txId=tx_sandbox_001 |
| Kutilgan javob | `{"result":{"perform_time":1792172500000,"transaction":"tx_sandbox_001","state":2}}` |
| Xavf | 🔴 Yuqori — order `paymentStatus → PAID`, PaymentLog yoziladi, Invoice yaratiladi |

**Eslatma:** Bu testni faqat CreateTransaction dan KEYIN bajaring.

---

### 8. CancelTransaction — Created holatidan ⚠️

| Maydon | Qiymat |
|--------|--------|
| Sandbox bo'limi | CancelTransaction (Created) |
| `id` | `tx_sandbox_001` (CreateTransaction dan keyin, PerformTransaction DAN OLDIN) |
| `time` | `1792172600000` |
| `reason` | `4` |
| Authorization | To'g'ri sandbox auth |
| Boshlang'ich holat | Order AWAITING_PAYMENT, txId=tx_sandbox_001, state=1 |
| Kutilgan javob | `{"result":{"cancel_time":1792172600000,"transaction":"tx_sandbox_001","state":-1,"reason":4}}` |
| Xavf | 🟡 O'rtacha — order `paymentStatus → PAYMENT_CANCELLED`, Invoice bekor qilinishga uriniladi |

**Eslatma:** Bu test CreateTransaction dan KEYIN, lekin PerformTransaction dan OLDIN bajarilishi kerak.

---

### 9. CancelTransaction — Performed holatidan ⚠️

| Maydon | Qiymat |
|--------|--------|
| Sandbox bo'limi | CancelTransaction (Performed) |
| `id` | `tx_sandbox_001` (Create + Perform qilingandan keyin) |
| `time` | `1792172700000` |
| `reason` | `4` |
| Authorization | To'g'ri sandbox auth |
| Boshlang'ich holat | Order PAID, txId=tx_sandbox_001, state=2 |
| Kutilgan javob | `{"result":{"cancel_time":1792172700000,"transaction":"tx_sandbox_001","state":-2,"reason":4}}` |
| Xavf | 🟡 O'rtacha — order `paymentStatus → PAYMENT_CANCELLED`, Invoice bekor qilinishga uriniladi |

**Eslatma:** Bu test PerformTransaction dan KEYIN bajarilishi kerak.

---

### 10. CheckTransaction ⚠️

| Maydon | Qiymat |
|--------|--------|
| Sandbox bo'limi | CheckTransaction |
| `id` | `tx_sandbox_001` |
| Authorization | To'g'ri sandbox auth |
| Boshlang'ich holat | Transaction mavjud |
| Kutilgan javob | Holatga qarab: <br>• Created: `{"result":{"create_time":...,"transaction":"tx_sandbox_001","state":1}}` <br>• Performed: `{"result":{"create_time":...,"perform_time":...,"transaction":"tx_sandbox_001","state":2}}` <br>• Cancelled: `{"result":{"create_time":...,"cancel_time":...,"transaction":"tx_sandbox_001","state":-1/-2,"reason":4}}` |
| Xavf | ⚪ Xavfsiz (faqat o'qish) |

---

### 11. GetStatement ✅

| Maydon | Qiymat |
|--------|--------|
| Sandbox bo'limi | GetStatement |
| `from` | `1792126800000` (2026-10-16T05:00:00Z) |
| `to` | `1792195199000` (2026-10-16T23:59:59Z) |
| Authorization | To'g'ri sandbox auth |
| Boshlang'ich holat | — |
| Kutilgan javob | `{"result":{"transactions":[...]}}` — barcha test orderlar ro'yxati |
| Xavf | ⚪ Xavfsiz (faqat o'qish) |

**Kutilgan transactionlar:**
- TEST_SANDBOX_001 (txId: 6ad1b1808d84b820a3b84665)
- TEST_PAYME_001 (txId: 6ad258458d84b820a3b84876 yoki yangilangan)
- TEST_PAYME_002 (txId: tx_prod_002)
- TEST_PAYME_003 (txId: tx_prod_003)
- TEST_PAYME_004 (txId: tx_deploy_test)
- TEST_PAYME_005 (txId: tx_005)

---

### 12. ChangePassword 🚫

| Maydon | Qiymat |
|--------|--------|
| Sandbox bo'limi | ChangePassword |
| `password` | Yangi kalit (masalan: `NewTestKey123!`) |
| `paymentMethodId` | `cmuy1y312000n8vuh7590mwu3` |
| Authorization | To'g'ri sandbox auth |
| Boshlang'ich holat | — |
| Kutilgan javob | `{"result":{"message":"Key updated"}}` |
| Xavf | 🔴 **BUZILISH!** — API kaliti o'zgaradi, barcha connectlar uziladi |

**⛔ TAVSIYA ETILMAYDI!** Agar test qilish zarur bo'lsa:
1. Avval joriy kalitni yozib oling
2. Testdan keyin darhol qayta o'rnating
3. Production'da bajarmang

---

## 3. Summa Hisoblash

```typescript
amount (tiyin) = Math.round(order.total * 100)
```

| orderNumber | total (som) | amount (tiyin) |
|-------------|-------------|----------------|
| TEST_PAYME_001 | 500 | 50000 |
| TEST_PAYME_002 | 500 | 50000 |
| TEST_PAYME_003 | 500 | 50000 |
| TEST_PAYME_004 | 500 | 50000 |
| TEST_PAYME_005 | 1000 | 100000 |
| TEST_SANDBOX_001 | 500 | 50000 |

---

## 4. Testlar Ketma-ketligi (Tavsiya)

### Variant A: Faqat xato holatlar (xavfsiz)

```
1. Неверная авторизация → -32504 ✅
2. Неверная сумма → -31001 ✅
3. Несуществующий счет → -31099 ✅
4. CheckPerformTransaction → {allow:true} ✅
5. GetStatement → transactions array ✅
```

### Variant B: To'liq oqim (Create→Perform→Cancel)

```
1. CheckPerformTransaction (TEST_PAYME_001, 50000) → {allow:true} ✅
2. CreateTransaction (TEST_PAYME_001, tx_sandbox_001) → state:1 ✅
3. CheckTransaction (tx_sandbox_001) → state:1 ✅
4. CancelTransaction (tx_sandbox_001) → state:-1 ✅
5. CheckTransaction (tx_sandbox_001) → state:-1 ✅
6. GetStatement → transactionlar ro'yxatida ko'rinadi ✅
```

### Variant C: Cancel after Perform

```
1. CheckPerformTransaction (TEST_PAYME_001, 50000) → {allow:true} ✅
2. CreateTransaction (TEST_PAYME_001, tx_sandbox_001) → state:1 ✅
3. PerformTransaction (tx_sandbox_001) → state:2 ✅
4. CancelTransaction (tx_sandbox_001) → state:-2 ✅
5. CheckTransaction (tx_sandbox_001) → state:-2 ✅
```

---

## 5. Invoice-Nomuvofiqlik

| Order | paymentStatus | Invoice | Muammo |
|-------|---------------|---------|--------|
| TEST_PAYME_001 | AWAITING_PAYMENT | ISSUED | Order to'lanmagan, invoice ISSUED |
| TEST_PAYME_004 | PAYMENT_CANCELLED | ISSUED | Order bekor, invoice ISSUED |
| TEST_PAYME_005 | PAYMENT_CANCELLED | ISSUED | Order bekor, invoice ISSUED |
| TEST_PAYME_003 | PAID | ISSUED | ✅ To'g'ri |

**Yechim:** `cancelInvoiceForOrder()` funksiyasi qo'shilgan (hozirgi branch da). Production deploy qilingandan keyin avtomatik tuzatiladi.

---

## 6. Xavf Jadvali

| Test | Xavf | Sabab |
|------|------|-------|
| Инструкция | ⚪ |faqat o'qish |
| Неверная авторизация | ⚪ | auth xato, DB o'zgarmaydi |
| Неверная сумма | ⚪ | xato qaytadi, DB o'zgarmaydi |
| Несуществующий счет | ⚪ | order topilmaydi, DB o'zgarmaydi |
| CheckPerformTransaction | ⚪ | faqat o'qish |
| CreateTransaction | 🟡 | paymentStatus + txId yangilanadi, PaymentLog yoziladi |
| PerformTransaction | 🔴 | paymentStatus → PAID, PaymentLog yoziladi, Invoice yaratiladi |
| CancelTransaction (Created) | 🟡 | paymentStatus → CANCELLED, Invoice bekor qilinadi |
| CancelTransaction (Performed) | 🟡 | paymentStatus → CANCELLED, Invoice bekor qilinadi |
| CheckTransaction | ⚪ | faqat o'qish |
| GetStatement | ⚪ | faqat o'qish |
| ChangePassword | 🔴 | API kaliti o'zgaradi, rollback qiyin |

---

## 7. Keyingi Qadamlar

1. Yuqoridagi testlarni Sandbox sahifasida bajarings
2. Natijalarni quyidagi formatda yuboring:
   ```
   Test nomi: [o'tdi/xato]
   Kutilgan: ...
   Haqiqiy: ...
   ```
3. Xatolar bo'lsa — error code va message ni ko'rsating
4. Hamma testlar o'tgandan keyin — branch ni main ga merge qiling

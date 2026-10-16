/**
 * 一次性脚本 — 创建 Payme Sandbox 测试订单
 *
 * 约束：
 *   - 仅新增测试订单，不修改现有记录
 *   - 直接写入生产 DB（raw SQL）
 *   - 仅限执行一次
 *
 * 执行方式：
 *   npx tsx scripts/create-payme-test-orders.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface TestOrder {
  id: string;
  orderNumber: string;
  totalSom: number; // 单位：索姆
}

// 测试订单列表：5 个订单，前 4 个 500 索姆，最后 1 个 1000 索姆
const TEST_ORDERS: TestOrder[] = [
  { id: "test_payme_001", orderNumber: "TEST_PAYME_001", totalSom: 500 },
  { id: "test_payme_002", orderNumber: "TEST_PAYME_002", totalSom: 500 },
  { id: "test_payme_003", orderNumber: "TEST_PAYME_003", totalSom: 500 },
  { id: "test_payme_004", orderNumber: "TEST_PAYME_004", totalSom: 500 },
  { id: "test_payme_005", orderNumber: "TEST_PAYME_005", totalSom: 1000 },
];

// 使用已有的 USER 角色用户
const TEST_USER_ID = "cmpp6ivr00000q745p6mf2fym";

async function main() {
  console.log("=== Payme 测试订单创建 ===\n");

  // 1. 检查是否已存在
  const placeholders = TEST_ORDERS.map((_, i) => `$${i + 1}`).join(", ");
  const existingRows = await prisma.$queryRawUnsafe<{ orderNumber: string }[]>(
    `SELECT "orderNumber" FROM "Order" WHERE "orderNumber" IN (${placeholders})`,
    ...TEST_ORDERS.map((o) => o.orderNumber)
  );

  const existingNumbers = new Set(existingRows.map((r) => r.orderNumber));

  if (existingNumbers.size > 0) {
    console.warn(
      `⚠️  以下 orderNumber 已存在，将跳过：${Array.from(existingNumbers).join(", ")}`
    );
  }

  const toInsert = TEST_ORDERS.filter(
    (o) => !existingNumbers.has(o.orderNumber)
  );

  if (toInsert.length === 0) {
    console.log("所有测试订单已存在，无需创建。");
    return;
  }

  console.log(`待创建订单数：${toInsert.length}\n`);

  // 2. 逐个插入（raw SQL，跳过 Prisma schema 校验）
  for (const order of toInsert) {
    const total = order.totalSom;
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Order" (
          "id", "orderNumber", "userId", "total", "deliveryFee", "status",
          "paymentMethod", "paymentStatus", "deliveryMethod", "discountAmount",
          "isTest", "createdVia", "updatedAt", "idempotencyKey"
        ) VALUES (
          $1, $2, $3, $4, 0, 'AWAITING_PAYMENT',
          'PAYME', 'AWAITING_PAYMENT', 'COURIER', 0,
          true, 'ADMIN_SCRIPT', NOW(), gen_random_uuid()
        )`,
        order.id,
        order.orderNumber,
        TEST_USER_ID,
        total
      );
      console.log(
        `✅ ${order.orderNumber} — total: ${total} 索姆 (${total * 100} 提因)`
      );
    } catch (err: any) {
      console.error(`❌ ${order.orderNumber} 创建失败: ${err.message}`);
    }
  }

  // 3. 验证结果
  console.log("\n=== 验证结果 ===");
  const checkPlaceholders = TEST_ORDERS.map((_, i) => `$${i + 1}`).join(", ");
  const createdRows = await prisma.$queryRawUnsafe<{
    orderNumber: string;
    total: number;
    paymentstatus: string;
    istest: boolean;
    paymentmethod: string;
  }>(
    `SELECT "orderNumber", "total", "paymentStatus", "isTest", "paymentMethod" FROM "Order" WHERE "orderNumber" IN (${checkPlaceholders}) ORDER BY "orderNumber"`,
    ...TEST_ORDERS.map((o) => o.orderNumber)
  );

  console.log(
    `\n共找到 ${createdRows.length} / ${TEST_ORDERS.length} 条记录\n`
  );
  for (const o of createdRows) {
    const tiyin = Math.round(o.total * 100);
    console.log(
      `  ${o.orderNumber} | total=${o.total} 索姆 (${tiyin} 提因) | status=${o.paymentstatus} | isTest=${o.istest} | method=${o.paymentmethod}`
    );
  }

  // 4. account.order_id 说明
  console.log("\n=== account.order_id 说明 ===");
  console.log("  代码中 account.order_id 匹配 'id' 或 'orderNumber'（OR 条件）");
  console.log("  建议使用 orderNumber（可读性强）\n");
  for (const o of TEST_ORDERS) {
    console.log(`    "${o.orderNumber}" → amount: ${o.totalSom * 100} (提因)`);
  }

  console.log("\n=== 完成 ===");
  console.log("订单已就绪，可进行 Sandbox 测试。");
}

main()
  .catch((e) => {
    console.error("致命错误:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

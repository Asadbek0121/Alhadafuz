import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyClickSignature, getClickConfig } from "@/lib/click";
import crypto from "crypto";

// Constants for Click actions
const ACTION_PREPARE = 0;
const ACTION_COMPLETE = 1;

// Click Error Codes
const ERROR_SUCCESS = 0;
const ERROR_SIGN_CHECK_FAILED = -1;
const ERROR_INVALID_AMOUNT = -2;
const ERROR_ACTION_NOT_FOUND = -3;
const ERROR_ALREADY_PAID = -4;
const ERROR_ORDER_NOT_FOUND = -5;
const ERROR_TRANSACTION_CANCELLED = -9;

/** CLICK_DEV_LOG=true bo'lsa, log'ga sensitive data tushmaydi */
const IS_DEV = process.env.CLICK_DEV_LOG === "true";

export async function POST(req: NextRequest) {
    // Click konfiguratsiyasi: avval admin paneldagi PaymentMethod.config, keyin env
    const config = await getClickConfig();
    if (!config) {
        console.error("[click] credentials missing");
        return NextResponse.json({ error: -1, error_note: "Internal Server Error: Config missing" });
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";

    // O'zgaruvchilarni try dan oldin e'pon qilish — catch block'da ham ishlatish uchun
    let clickTransId = "";
    let serviceId = "";
    let merchantTransId = "";
    let merchantPrepareId = "";
    let amountStr = "0";
    let action = 0;
    let amount = 0;
    let signTime = "";
    let signString = "";

    try {
        const formData = await req.formData();
        const data = Object.fromEntries(formData.entries());

        clickTransId = data.click_trans_id as string;
        serviceId = data.service_id as string;
        merchantTransId = data.merchant_trans_id as string;
        merchantPrepareId = data.merchant_prepare_id as string || "";
        amountStr = data.amount as string;
        const actionStr = data.action as string;
        signTime = data.sign_time as string;
        signString = data.sign_string as string;

        action = parseInt(actionStr);
        amount = parseFloat(amountStr);

        if (!clickTransId || !merchantTransId || !amount || isNaN(action)) {
            return NextResponse.json({ error: -1, error_note: "Invalid request parameters" });
        }

        // 0. Logging (sensitive ma'lumotlarni redakt qilish)
        const logData = { ...data };
        delete logData.sign_string; // imzo log'da yo'q
        await prisma.paymentLog.create({
            data: {
                provider: "CLICK",
                transactionId: clickTransId,
                amount,
                status: "REQUEST_RECEIVED",
                requestData: JSON.stringify(logData),
                ipAddress: ip,
            },
        });

        // 1. Validate Signature
        const computedSignature = verifyClickSignature(
            clickTransId,
            serviceId,
            config.secretKey,
            merchantTransId,
            action === ACTION_COMPLETE ? merchantPrepareId : null,
            amountStr,
            action,
            signTime
        );

        // Verify Service ID
        if (serviceId !== config.serviceId) {
            return NextResponse.json({ error: ERROR_SIGN_CHECK_FAILED, error_note: "Service ID mismatch" });
        }

        // Constant-time signature comparison
        const requestSignBuffer = Buffer.from(signString || "");
        const mySignBuffer = Buffer.from(computedSignature);

        if (requestSignBuffer.length !== mySignBuffer.length || !crypto.timingSafeEqual(requestSignBuffer, mySignBuffer)) {
            console.warn(`[click] signature mismatch for ${clickTransId}`);
            await prisma.paymentLog.create({
                data: { provider: "CLICK", transactionId: clickTransId, status: "SIGNATURE_FAILED", ipAddress: ip },
            });
            return NextResponse.json({ error: ERROR_SIGN_CHECK_FAILED, error_note: "Signature mismatch" });
        }

        // 2. Find Order — transaction_param = orderNumber
        const order = await prisma.order.findFirst({
            where: {
                OR: [
                    { orderNumber: merchantTransId },
                    { id: merchantTransId },
                ],
            },
        });

        if (!order) {
            return NextResponse.json({ error: ERROR_ORDER_NOT_FOUND, error_note: "Order not found" });
        }

        // 3. Amount Validation
        if (Math.abs(order.total - amount) > 0.01) {
            await prisma.paymentLog.create({
                data: {
                    provider: "CLICK",
                    transactionId: clickTransId,
                    status: "ERROR",
                    responseData: `Amount mismatch: ${order.total} vs ${amount}`,
                    ipAddress: ip,
                },
            });
            return NextResponse.json({ error: ERROR_INVALID_AMOUNT, error_note: "Incorrect amount" });
        }

        // 4. Handle Actions
        if (action === ACTION_PREPARE) {
            if (order.status === "CANCELLED") {
                return NextResponse.json({ error: ERROR_TRANSACTION_CANCELLED, error_note: "Order cancelled" });
            }
            if (order.paymentStatus === "PAID") {
                return NextResponse.json({ error: ERROR_ALREADY_PAID, error_note: "Already paid" });
            }

            return NextResponse.json({
                click_trans_id: clickTransId,
                merchant_trans_id: merchantTransId,
                merchant_prepare_id: merchantTransId,
                error: ERROR_SUCCESS,
                error_note: "Success",
            });
        }

        if (action === ACTION_COMPLETE) {
            if (order.status === "CANCELLED") {
                return NextResponse.json({ error: ERROR_TRANSACTION_CANCELLED, error_note: "Order cancelled" });
            }

            // Idempotency: allaqachon to'langan bo'lsa
            if (order.paymentStatus === "PAID") {
                return NextResponse.json({
                    click_trans_id: clickTransId,
                    merchant_trans_id: merchantTransId,
                    merchant_confirm_id: merchantTransId,
                    error: ERROR_SUCCESS,
                    error_note: "Order already paid",
                });
            }

            // To'lovni amalga oshirish
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: "PAID",
                    paymentProvider: "CLICK",
                    clickTransactionId: clickTransId,
                },
            });

            await prisma.paymentLog.create({
                data: {
                    provider: "CLICK",
                    transactionId: clickTransId,
                    status: "SUCCESS",
                    responseData: "PAID",
                    ipAddress: ip,
                },
            });

            // Invoice yaratish (async)
            import('@/lib/invoice/invoice-service').then(({ createInvoiceForOrder }) => {
                createInvoiceForOrder(order.id).catch((e: unknown) => {
                    console.error("[invoice] Click invoice creation failed:", e);
                });
            }).catch(() => {});

            // Notification — async, don't block response. Secrets (keys, tokens) never logged.
            import('@/lib/payment-notifications').then(({ notifyPayment }) => {
                notifyPayment({
                    orderNumber: order.orderNumber || order.id,
                    userId: order.userId,
                    amount: order.total,
                    paymentMethod: 'CLICK',
                    status: 'SUCCESS',
                    ipAddress: ip,
                }).catch(() => {});
            }).catch(() => {});

            return NextResponse.json({
                click_trans_id: clickTransId,
                merchant_trans_id: merchantTransId,
                merchant_confirm_id: merchantTransId,
                error: ERROR_SUCCESS,
                error_note: "Success",
            });
        }

        return NextResponse.json({ error: ERROR_ACTION_NOT_FOUND, error_note: "Action not supported" });

    } catch (error) {
        console.error("[click] handler error:", error);
        await prisma.paymentLog.create({
            data: {
                provider: "CLICK",
                transactionId: clickTransId || "UNKNOWN",
                status: "CRITICAL_ERROR",
                responseData: String(error),
                ipAddress: ip,
            },
        });
        return NextResponse.json({ error: -1, error_note: "Internal Server Error" });
    }
}

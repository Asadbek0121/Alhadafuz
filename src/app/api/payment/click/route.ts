
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyClickSignature } from "@/lib/click";
import crypto from "crypto";

// Environment variables
const CLICK_SERVICE_ID = process.env.CLICK_SERVICE_ID;
const CLICK_SECRET_KEY = process.env.CLICK_SECRET_KEY;

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

export async function POST(req: NextRequest) {
    if (!CLICK_SERVICE_ID || !CLICK_SECRET_KEY) {
        console.error("Click credentials missing in environment variables");
        return NextResponse.json({ error: -1, error_note: "Internal Server Error: Config missing" });
    }

    // IP Logging
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    try {
        const formData = await req.formData();
        const data = Object.fromEntries(formData.entries());

        const clickTransId = data.click_trans_id as string;
        const serviceId = data.service_id as string;
        const merchantTransId = data.merchant_trans_id as string;
        const merchantPrepareId = data.merchant_prepare_id as string || "";
        const amountStr = data.amount as string;
        const actionStr = data.action as string;
        const errorStr = data.error as string;
        const signTime = data.sign_time as string;
        const signString = data.sign_string as string;

        const action = parseInt(actionStr);
        const amount = parseFloat(amountStr);

        // 0. LOGGING (Async to not block, but await for safety in serverless)
        // Note: Sensitive data in logs should be redacted if expanding this
        await prisma.paymentLog.create({
            data: {
                provider: "CLICK",
                transactionId: clickTransId,
                amount: amount,
                status: "REQUEST_RECEIVED",
                requestData: JSON.stringify(data),
                ipAddress: ip
            }
        });

        // 1. Validate Signature
        // Use helper function from lib/click to ensure consistent logic
        const computedSignature = verifyClickSignature(
            clickTransId,
            serviceId,
            CLICK_SECRET_KEY,
            merchantTransId,
            action === ACTION_COMPLETE ? merchantPrepareId : null,
            amountStr,
            action,
            signTime
        );

        // Verify Service ID
        if (serviceId !== CLICK_SERVICE_ID) {
            return NextResponse.json({ error: ERROR_SIGN_CHECK_FAILED, error_note: "Service ID mismatch" });
        }

        // Constant-time signature comparison
        const requestSignBuffer = Buffer.from(signString || "");
        const mySignBuffer = Buffer.from(computedSignature);

        if (requestSignBuffer.length !== mySignBuffer.length || !crypto.timingSafeEqual(requestSignBuffer, mySignBuffer)) {
            console.warn(`Signature mismatch. Calc: ${computedSignature}, Recv: ${signString}`);
            await prisma.paymentLog.create({
                data: { provider: "CLICK", transactionId: clickTransId, status: "SIGNATURE_FAILED", responseData: "Signature mismatch", ipAddress: ip }
            });
            return NextResponse.json({ error: ERROR_SIGN_CHECK_FAILED, error_note: "Signature mismatch" });
        }

        // 2. Check if Payment Method is Active
        const paymentMethod = await prisma.paymentMethod.findFirst({
            where: { provider: 'CLICK' }
        });

        // If payment method logic is strict, uncomment below. Currently allowing loose check or assuming it exists.
        if (paymentMethod && !paymentMethod.isActive) {
            return NextResponse.json({ error: -1, error_note: "Payment method disabled" });
        }

        // 3. Find Order
        const order = await prisma.order.findUnique({
            where: { id: merchantTransId },
        });

        if (!order) {
            return NextResponse.json({ error: ERROR_ORDER_NOT_FOUND, error_note: "Order not found" });
        }

        // 4. Amount Validation
        // Click sends amount as float string. Order total is Float.
        // E.g. 1000.00 vs 1000
        if (Math.abs(order.total - amount) > 0.01) { // Strict check with small epsilon
            await prisma.paymentLog.create({
                data: { provider: "CLICK", transactionId: clickTransId, status: "ERROR", responseData: `Amount mismatch: ${order.total} vs ${amount}`, ipAddress: ip }
            });
            return NextResponse.json({ error: ERROR_INVALID_AMOUNT, error_note: "Incorrect amount" });
        }

        // 5. Handle Actions
        if (action === ACTION_PREPARE) {
            // Check order status
            if (order.status === "CANCELLED") {
                return NextResponse.json({ error: ERROR_TRANSACTION_CANCELLED, error_note: "Order cancelled" });
            }
            if (order.paymentStatus === "PAID") {
                return NextResponse.json({ error: ERROR_ALREADY_PAID, error_note: "Already paid" });
            }

            // Success Prepare
            // We return the same info to confirm we are ready
            return NextResponse.json({
                click_trans_id: clickTransId,
                merchant_trans_id: merchantTransId,
                merchant_prepare_id: merchantTransId, // Using OrderID as PrepareID for simplicity
                error: ERROR_SUCCESS,
                error_note: "Success",
            });

        } else if (action === ACTION_COMPLETE) {
            // Check status again
            if (order.status === "CANCELLED") {
                return NextResponse.json({ error: ERROR_TRANSACTION_CANCELLED, error_note: "Order cancelled" });
            }

            // Idempotency check
            if (order.paymentStatus === "PAID") {
                if (order.paymentId === clickTransId) {
                    return NextResponse.json({
                        click_trans_id: clickTransId,
                        merchant_trans_id: merchantTransId,
                        merchant_confirm_id: merchantTransId,
                        error: ERROR_SUCCESS,
                        error_note: "Already paid",
                    });
                }
                return NextResponse.json({ error: ERROR_ALREADY_PAID, error_note: "Already paid" });
            }

            // Perform Update Transactionally
            // Note: If you have inventory management, decrement stock here inside a transaction.
            await prisma.order.update({
                where: { id: merchantTransId },
                data: {
                    paymentStatus: "PAID",
                    paymentProvider: "CLICK",
                    paymentId: clickTransId,
                    // If you want to auto-move to processing:
                    // status: "PROCESSING" 
                },
            });

            await prisma.paymentLog.create({
                data: { provider: "CLICK", transactionId: clickTransId, status: "SUCCESS", responseData: "PAID", ipAddress: ip }
            });

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
        console.error("Click Handler Error:", error);
        await prisma.paymentLog.create({
            data: { provider: "CLICK", transactionId: "UNKNOWN", status: "CRITICAL_ERROR", responseData: String(error), ipAddress: ip }
        });
        return NextResponse.json({ error: -1, error_note: "Internal Server Error" });
    }
}

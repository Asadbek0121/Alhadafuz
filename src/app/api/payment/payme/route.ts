/**
 * Payme Merchant API JSON-RPC 2.0 endpoint
 * POST https://alhadaf.uz/api/payment/payme
 *
 * Barcha metodlar: CheckPerformTransaction, CreateTransaction, PerformTransaction,
 * CancelTransaction, CheckTransaction, GetStatement
 */

import { NextRequest, NextResponse } from "next/server";
import {
    handleCheckPerformTransaction,
    handleCreateTransaction,
    handlePerformTransaction,
    handleCancelTransaction,
    handleCheckTransaction,
    handleGetStatement,
    PaymeTransactionState,
} from "@/lib/payme";

export async function POST(req: NextRequest) {
    let body: {
        jsonrpc?: string;
        method?: string;
        params?: Record<string, unknown>;
        id?: number | string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { jsonrpc: "2.0", error: { code: -32700, message: "Parse error", data: null }, id: null },
            { status: 200 }
        );
    }

    if (body?.jsonrpc !== "2.0" || !body?.method || !body?.params) {
        return NextResponse.json(
            { jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request", data: null }, id: body?.id ?? null },
            { status: 200 }
        );
    }

    const { method, params } = body;
    const rpcId = body.id ?? null;

    try {
        let result: unknown;

        switch (method) {
            case "CheckPerformTransaction": {
                const amount = Number(params?.amount);
                const account = params?.account as { order_id: string } | undefined;
                if (isNaN(amount) || !account?.order_id) {
                    throw { code: -31000, message: "Invalid params", data: [] };
                }
                const resp = await handleCheckPerformTransaction(amount, account);
                result = resp;
                break;
            }

            case "CreateTransaction": {
                const id = String(params?.id ?? "");
                const time = Number(params?.time ?? 0);
                const amount = Number(params?.amount);
                const account = params?.account as { order_id: string } | undefined;

                if (!id || isNaN(time) || isNaN(amount) || !account?.order_id) {
                    throw { code: -31000, message: "Invalid params", data: [] };
                }

                const resp = await handleCreateTransaction(id, time, amount, account);
                result = resp;
                break;
            }

            case "PerformTransaction": {
                const id = String(params?.id ?? "");
                if (!id) {
                    throw { code: -31000, message: "Invalid params", data: [] };
                }
                const resp = await handlePerformTransaction(id);
                result = resp;
                break;
            }

            case "CancelTransaction": {
                const id = String(params?.id ?? "");
                const time = Number(params?.time ?? 0);
                const reason = params?.reason !== undefined ? Number(params.reason) : null;

                if (!id || isNaN(time)) {
                    throw { code: -31000, message: "Invalid params", data: [] };
                }
                const resp = await handleCancelTransaction(id, time, reason);
                result = resp;
                break;
            }

            case "CheckTransaction": {
                const id = String(params?.id ?? "");
                if (!id) {
                    throw { code: -31000, message: "Invalid params", data: [] };
                }
                const resp = await handleCheckTransaction(id);
                result = resp;
                break;
            }

            case "GetStatement": {
                const from = Number(params?.from ?? 0);
                const to = Number(params?.to ?? 0);
                if (isNaN(from) || isNaN(to)) {
                    throw { code: -31000, message: "Invalid params", data: [] };
                }
                const resp = await handleGetStatement(from, to);
                result = resp;
                break;
            }

            default:
                throw { code: -32601, message: `Method not found: ${method}`, data: [] };
        }

        return NextResponse.json({ jsonrpc: "2.0", result, id: rpcId }, { status: 200 });

    } catch (e: unknown) {
        const err = e as { code?: number; message?: string; data?: unknown[] };
        const errorCode = err.code ?? -32603;
        const errorMessage = err.message ?? "Internal error";
        const errorData = err.data ?? [];

        return NextResponse.json(
            { jsonrpc: "2.0", error: { code: errorCode, message: errorMessage, data: errorData }, id: rpcId },
            { status: 200 }
        );
    }
}

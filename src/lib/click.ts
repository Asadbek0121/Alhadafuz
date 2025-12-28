
import crypto from "crypto";

export const generateClickUrl = (
    serviceId: string,
    merchantId: string,
    merchantTransId: string,
    amount: number
) => {
    const baseUrl = "https://my.click.uz/services/pay";
    const params = new URLSearchParams();
    params.append("service_id", serviceId);
    params.append("merchant_id", merchantId);
    params.append("amount", amount.toFixed(2));
    params.append("transaction_param", merchantTransId);
    return `${baseUrl}?${params.toString()}`;
};

/**
 * Verifies the Click Pay MD5 signature.
 * specific logic: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + (merchant_prepare_id if action=1) + amount + action + sign_time)
 */
export const verifyClickSignature = (
    clickTransId: string,
    serviceId: string,
    secretKey: string,
    merchantTransId: string,
    merchantPrepareId: string | null,
    amount: string, // Click sends amount as string
    action: number,
    signTime: string
): string => {
    const prepareId = action === 1 && merchantPrepareId ? merchantPrepareId : "";
    const str = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${prepareId}${amount}${action}${signTime}`;
    return crypto.createHash("md5").update(str).digest("hex");
};

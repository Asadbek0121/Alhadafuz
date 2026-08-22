// /uz/tracking eski single-order tracking sahifasi edi.
// Endi /uz/delivery multi-order real-time tracking dashboard bor.
// Redirect: /tracking?order=ID → /delivery?order=ID
import { redirect } from "next/navigation";

export default async function TrackingRedirect({
    searchParams,
}: {
    searchParams: Promise<{ order?: string }>;
}) {
    const { order } = await searchParams;
    redirect(order ? `/delivery?order=${order}` : "/delivery");
}

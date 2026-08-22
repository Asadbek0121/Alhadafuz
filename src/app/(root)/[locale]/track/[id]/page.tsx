// /uz/track/[id] — eski single-order tracking sahifasi.
// Endi /uz/delivery multi-order real-time tracking dashboard mavjud va
// `?order=ID` parametri bilan bitta buyurtmani tanlab zoom qiladi.
// Redirect: /track/ID → /delivery?order=ID
import { redirect } from "next/navigation";

export default async function TrackRedirect({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/delivery?order=${id}`);
}

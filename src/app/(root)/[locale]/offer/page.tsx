// /uz/offer — Ommaviy oferta hujjati.
// To'liq hujjat /terms sahifasida joylashgan — ikkita manba bo'lmasligi uchun
// bu yerda redirect qilinadi.
import { redirect } from "next/navigation";

export default async function OfferPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    redirect(`/${locale}/terms`);
}

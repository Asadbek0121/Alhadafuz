// Metadata holder for this route: the page here is a Client Component, and
// generateMetadata is a Server Component-only export.
import type { Metadata } from "next";
import { translatedPageMetadata } from "@/lib/seo";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    return translatedPageMetadata("orderSuccess", { locale, path: "/order-success", noindex: true });
}

export default function OrderSuccessLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

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
    return translatedPageMetadata("profileOrders", { locale, path: "/profile/orders", noindex: true });
}

export default function ProfileOrdersLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

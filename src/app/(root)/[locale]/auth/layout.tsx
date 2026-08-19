// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute
import type { Metadata } from "next";
import { translatedPageMetadata } from "@/lib/seo";

// Shared default for the auth screens; each screen below narrows the title.
export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    return translatedPageMetadata("auth", { locale, path: "/auth/login", noindex: true });
}

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4">
            {children}
        </div>
    );
}

// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute
import type { Metadata } from "next";
import SidebarProfile from "@/components/profile/SidebarProfile";
import ProfileMobileHeader from "@/components/profile/ProfileMobileHeader";
import { translatedPageMetadata } from "@/lib/seo";

// Default for the account area; each sub-route narrows the title from its own
// layout. Everything under /profile is per-shopper, so none of it is indexable.
export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    return translatedPageMetadata("profile", { locale, path: "/profile", noindex: true });
}


export default function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container flex flex-col lg:flex-row gap-8 py-8 pb-24 lg:pb-8">
                <SidebarProfile />
                <main className="flex-1 max-w-4xl">
                    <ProfileMobileHeader />
                    {children}
                </main>
            </div>

        </div>
    );
}

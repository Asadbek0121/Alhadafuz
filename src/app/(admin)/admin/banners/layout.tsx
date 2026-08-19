import type { Metadata } from "next";

export const metadata: Metadata = {
    // The template is re-declared so nested admin routes keep the suffix:
    // resolving a title otherwise consumes the parent's template.
    title: { default: "Bannerlar", template: "%s | Hadaf Admin" },
};

export default function BannersLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

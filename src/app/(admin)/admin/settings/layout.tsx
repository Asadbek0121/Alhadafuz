import type { Metadata } from "next";

export const metadata: Metadata = {
    // The template is re-declared so nested admin routes keep the suffix:
    // resolving a title otherwise consumes the parent's template.
    title: { default: "Sozlamalar", template: "%s | Hadaf Admin" },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

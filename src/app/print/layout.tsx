// noinspection CssInlineStyles,HtmlFormInputWithoutLabel,HtmlUnknownAttribute
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Print Invoice",
    description: "Print layout for Hadaf Market Invoice",
};

export default function PrintLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

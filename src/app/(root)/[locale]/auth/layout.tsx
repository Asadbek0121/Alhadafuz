import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kirish | UZMarket",
    description: "Hisobingizga kiring yoki yangi hisob yarating",
};

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

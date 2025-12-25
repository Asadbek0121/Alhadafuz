import ProfileSidebar from "@/components/profile/ProfileSidebar";
import BottomNav from "@/components/profile/BottomNav";

export default function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container flex flex-col md:flex-row gap-8 py-8 pb-24 md:pb-8">
                <ProfileSidebar />
                <main className="flex-1 max-w-4xl">
                    {children}
                </main>
            </div>
            <BottomNav />
        </div>
    );
}

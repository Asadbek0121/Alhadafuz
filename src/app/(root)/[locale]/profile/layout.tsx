import ProfileSidebar from "@/components/profile/ProfileSidebar";
import ProfileMobileHeader from "@/components/profile/ProfileMobileHeader";


export default function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container flex flex-col lg:flex-row gap-8 py-8 pb-24 lg:pb-8">
                <ProfileSidebar />
                <main className="flex-1 max-w-4xl">
                    <ProfileMobileHeader />
                    {children}
                </main>
            </div>

        </div>
    );
}

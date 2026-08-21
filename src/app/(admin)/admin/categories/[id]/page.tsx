import { redirect } from "next/navigation";

export default async function CategoryDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/admin/categories/${id}/attributes`);
}

import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const businesses = await prisma.businessMember.findMany({
    where: { userId: session.user.id },
    include: { business: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        businesses={businesses.map((m) => ({
          id: m.business.id,
          name: m.business.name,
          role: m.role,
        }))}
        user={{ name: session.user.name ?? "", email: session.user.email ?? "" }}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

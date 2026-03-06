import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function Home() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  // Buscar el primer negocio del usuario
  const membership = await prisma.businessMember.findFirst({
    where: { userId: session.user.id },
    select: { businessId: true },
    orderBy: { createdAt: "asc" },
  });

  if (membership) {
    redirect(`/${membership.businessId}`);
  }

  // Si no tiene negocios, mostrar pantalla para crear uno
  redirect("/login");
}

import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateBusinessDialog } from "@/components/layout/create-business-dialog";

export default async function HomePage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const memberships = await prisma.businessMember.findMany({
    where: { userId: session.user.id },
    include: {
      business: {
        include: {
          _count: { select: { employees: { where: { status: "ACTIVE" } } } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Si no hay negocios, mostrar la pantalla de creación directamente

  const roleLabel: Record<string, string> = {
    OWNER: "Propietario",
    ADMIN: "Administrador",
    VIEWER: "Solo lectura",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mis Negocios</h1>
          <p className="text-slate-500 mt-1">Seleccioná un negocio para administrar</p>
        </div>
        <CreateBusinessDialog />
      </div>

      {memberships.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-slate-500 mb-4">Todavía no tenés negocios.</p>
            <CreateBusinessDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {memberships.map((m) => (
            <Link key={m.business.id} href={`/${m.business.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                      {m.business.name.charAt(0).toUpperCase()}
                    </div>
                    <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>
                      {roleLabel[m.role]}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3">{m.business.name}</CardTitle>
                  <CardDescription>{m.business.currency}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">{m.business._count.employees}</span>{" "}
                    empleados activos
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

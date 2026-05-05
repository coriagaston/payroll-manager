import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { AcceptInviteButton } from "./accept-button";

interface Props { params: Promise<{ token: string }> }

const roleLabel: Record<string, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  VIEWER: "Lector",
};

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const session = await getAuthSession();

  const invitation = await prisma.businessInvitation.findUnique({
    where: { token },
    include: { business: { select: { id: true, name: true } } },
  });

  const isExpired = invitation && invitation.expiresAt < new Date();
  const isAccepted = invitation && !!invitation.acceptedAt;

  if (!invitation || isExpired || isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invitación inválida</CardTitle>
            <CardDescription>
              {!invitation
                ? "El enlace no existe."
                : isAccepted
                ? "Esta invitación ya fue aceptada."
                : "Esta invitación expiró."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild variant="outline">
              <Link href="/login">Ir al inicio de sesión</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const wrongEmail = session && session.user.email !== invitation.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div>
            <CardTitle>Invitación a {invitation.business.name}</CardTitle>
            <CardDescription className="mt-2">
              Fuiste invitado como{" "}
              <Badge variant="outline" className="ml-1">
                {roleLabel[invitation.role] ?? invitation.role}
              </Badge>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Este enlace es para <strong>{invitation.email}</strong>
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {!session ? (
            <>
              <Button asChild className="w-full">
                <Link href={`/login?callbackUrl=/invite/${token}`}>
                  Iniciar sesión para aceptar
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/register?inviteToken=${token}`}>
                  Crear cuenta nueva
                </Link>
              </Button>
            </>
          ) : wrongEmail ? (
            <p className="text-sm text-red-500 text-center">
              Estás logueado como <strong>{session.user.email}</strong>. Esta invitación es para{" "}
              <strong>{invitation.email}</strong>.
            </p>
          ) : (
            <AcceptInviteButton token={token} />
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

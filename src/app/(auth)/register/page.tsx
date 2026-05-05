import { prisma } from "@/lib/db";
import { RegisterForm } from "./register-form";

interface Props {
  searchParams: Promise<{ inviteToken?: string }>;
}

export default async function RegisterPage({ searchParams }: Props) {
  const { inviteToken } = await searchParams;

  let inviteEmail: string | undefined;
  if (inviteToken) {
    const invitation = await prisma.businessInvitation.findUnique({
      where: { token: inviteToken },
      select: { email: true, expiresAt: true, acceptedAt: true },
    });
    if (invitation && !invitation.acceptedAt && invitation.expiresAt > new Date()) {
      inviteEmail = invitation.email;
    }
  }

  return <RegisterForm inviteToken={inviteToken} inviteEmail={inviteEmail} />;
}

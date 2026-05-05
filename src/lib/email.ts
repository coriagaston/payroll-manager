import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM ?? "AdSueldos <onboarding@resend.dev>";

const roleLabel: Record<string, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  VIEWER: "Lector",
};

export async function sendInvitationEmail({
  to,
  businessName,
  role,
  inviteUrl,
}: {
  to: string;
  businessName: string;
  role: string;
  inviteUrl: string;
}) {
  if (!resend) {
    console.log(`[email] Sin RESEND_API_KEY — enlace de invitación para ${to}: ${inviteUrl}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Fuiste invitado a ${businessName} en AdSueldos`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <div style="margin-bottom:20px;">
          <div style="display:inline-block;width:40px;height:40px;background:#3b82f6;border-radius:8px;text-align:center;line-height:40px;">
            <span style="color:#fff;font-weight:700;font-size:18px;">A</span>
          </div>
          <span style="margin-left:10px;font-weight:600;font-size:16px;vertical-align:middle;">AdSueldos</span>
        </div>
        <h2 style="margin:0 0 8px;">Te invitaron a ${businessName}</h2>
        <p style="color:#4b5563;margin:0 0 20px;">
          Fuiste invitado como <strong>${roleLabel[role] ?? role}</strong>. El enlace expira en 7 días.
        </p>
        <a href="${inviteUrl}"
           style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
          Aceptar invitación
        </a>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px;">
          Si no esperabas esta invitación, ignorá este correo.
        </p>
      </div>
    `,
  });
}

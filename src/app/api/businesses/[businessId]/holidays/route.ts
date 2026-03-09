import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireBusinessAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Params { params: Promise<{ businessId: string }> }

// Feriados nacionales argentinos 2025
const FERIADOS_2025 = [
  { date: "2025-01-01", name: "Año Nuevo" },
  { date: "2025-03-03", name: "Carnaval" },
  { date: "2025-03-04", name: "Carnaval" },
  { date: "2025-03-24", name: "Día Nacional de la Memoria por la Verdad y la Justicia" },
  { date: "2025-04-02", name: "Día del Veterano y de los Caídos en la Guerra de Malvinas" },
  { date: "2025-04-18", name: "Viernes Santo" },
  { date: "2025-05-01", name: "Día del Trabajador" },
  { date: "2025-05-25", name: "Día de la Revolución de Mayo" },
  { date: "2025-06-16", name: "Paso a la Inmortalidad del Gral. Manuel Belgrano (en sustitución)" },
  { date: "2025-07-09", name: "Día de la Independencia" },
  { date: "2025-08-18", name: "Paso a la Inmortalidad del Gral. José de San Martín (en sustitución)" },
  { date: "2025-10-12", name: "Día del Respeto a la Diversidad Cultural" },
  { date: "2025-11-20", name: "Día de la Soberanía Nacional" },
  { date: "2025-11-24", name: "Día de la Soberanía Nacional (en sustitución)" },
  { date: "2025-12-08", name: "Inmaculada Concepción de María" },
  { date: "2025-12-25", name: "Navidad" },
];

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { businessId } = await params;

  try {
    await requireBusinessAccess(businessId, session.user.id, "ADMIN");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Insertar ignorando duplicados (unique constraint businessId + date)
  let added = 0;
  for (const h of FERIADOS_2025) {
    try {
      await prisma.holiday.create({
        data: { businessId, date: new Date(h.date), name: h.name },
      });
      added++;
    } catch {
      // Duplicado — ignorar
    }
  }

  return NextResponse.json({ added, total: FERIADOS_2025.length });
}

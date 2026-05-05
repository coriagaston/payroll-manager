"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  token: string;
}

export function AcceptInviteButton({ token }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const accept = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("¡Invitación aceptada!");
      router.push(`/${data.businessId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al aceptar");
      setLoading(false);
    }
  };

  return (
    <Button className="w-full" onClick={accept} disabled={loading}>
      {loading ? "Aceptando..." : "Aceptar invitación"}
    </Button>
  );
}

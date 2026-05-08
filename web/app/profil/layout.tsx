"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isCustomerLoggedIn } from "@/lib/customer-auth";

export default function ProfilLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isCustomerLoggedIn()) {
      router.push("/login/customer?returnTo=/profil");
    }
  }, [router]);

  return <>{children}</>;
}

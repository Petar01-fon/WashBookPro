"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveCustomerTokens } from "@/lib/customer-auth";
import { Suspense } from "react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const refresh = searchParams.get("refresh");

    if (token && refresh) {
      saveCustomerTokens(token, refresh);
      const returnTo = searchParams.get("returnTo") ?? "/";
      router.replace(returnTo);
    } else {
      router.replace("/login/customer");
    }
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Prijava u toku...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Učitavanje...</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}

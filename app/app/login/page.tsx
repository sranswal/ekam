"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/?auth=open");
  }, [router]);
  return <noscript>Open / to sign in.</noscript>;
}

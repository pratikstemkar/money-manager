"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
      Loading dashboard…
    </div>
  );
}

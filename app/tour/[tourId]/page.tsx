"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadTour } from "@/lib/data/SessionStore";

export default function TourIdPage() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    const session = loadTour();
    if (session) router.replace("/tour/active");
    else router.replace("/create");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950">
      <div className="w-10 h-10 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
    </div>
  );
}

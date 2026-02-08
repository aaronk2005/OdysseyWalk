import { NextResponse } from "next/server";
import { getSummaries } from "@/lib/tours";

export async function GET() {
  const tours = getSummaries();
  return NextResponse.json({ tours });
}

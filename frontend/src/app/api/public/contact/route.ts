import { NextResponse } from "next/server";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(180),
  company: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(120),
  companyContext: z.string().trim().max(220).optional(),
  intent: z.enum(["demo", "pricing", "general"]),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = contactSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  console.info("[public-contact-submission]", parsed.data);
  return NextResponse.json({ status: "accepted" }, { status: 202 });
}

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackPublicEvent } from "@/marketing/lib/analytics";

const intents = ["demo", "pricing", "general"] as const;
type Intent = typeof intents[number];

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setStatus("submitting");
    setError("");
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      company: String(formData.get("company") ?? "").trim(),
      role: String(formData.get("role") ?? "").trim(),
      companyContext: String(formData.get("companyContext") ?? "").trim(),
      intent: String(formData.get("intent") ?? "general") as Intent,
      notes: String(formData.get("notes") ?? "").trim(),
    };

    if (!payload.name || !payload.email || !payload.company || !payload.role) {
      setStatus("error");
      setError("Please complete name, work email, company, and role.");
      return;
    }

    const response = await fetch("/api/public/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setStatus("error");
      setError("Submission failed. Please retry or email support.");
      return;
    }

    setStatus("success");
    trackPublicEvent("contact_submitted", { intent: payload.intent });
  }

  return <form action={onSubmit} className="mt-8 space-y-4 rounded-lg border border-border/70 p-5">
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
      <div className="space-y-2"><Label htmlFor="email">Work email</Label><Input id="email" name="email" type="email" required /></div>
      <div className="space-y-2"><Label htmlFor="company">Company</Label><Input id="company" name="company" required /></div>
      <div className="space-y-2"><Label htmlFor="role">Role</Label><Input id="role" name="role" required /></div>
      <div className="space-y-2 md:col-span-2"><Label htmlFor="companyContext">Company size or context</Label><Input id="companyContext" name="companyContext" placeholder="e.g. multi-entity services group" /></div>
      <div className="space-y-2 md:col-span-2"><Label htmlFor="intent">Preferred follow-up</Label><select id="intent" name="intent" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{intents.map((intent) => <option key={intent} value={intent}>{intent}</option>)}</select></div>
      <div className="space-y-2 md:col-span-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={5} /></div>
    </div>
    {status === "error" ? <p className="text-sm text-red-600">{error}</p> : null}
    {status === "success" ? <p className="text-sm text-emerald-600">Thanks — request received. We will follow up shortly.</p> : null}
    <Button type="submit" disabled={status === "submitting"}>{status === "submitting" ? "Submitting..." : "Submit request"}</Button>
  </form>;
}

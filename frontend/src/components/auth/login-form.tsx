"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthCard } from "@/components/auth/auth-card";
import { PasswordField } from "@/components/forms/password-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { Form } from "@/components/ui/form";
import { useAuth } from "@/providers/auth-provider";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas";
import { ApiError } from "@/lib/api/errors";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      await login(values);
      toast.success("Welcome back to StarAcc.");
      router.replace(searchParams.get("redirectTo") || "/dashboard");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "We couldn't sign you in with those credentials.";
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <AuthCard
      title="Sign in"
      description="Access your accounting workspace, restore your organization context, and continue where you left off."
      footer={
        <p className="text-sm text-muted-foreground">
          New to StarAcc?{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Create your account
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <TextField form={form} name="email" label="Email" placeholder="finance@company.com" type="email" />
          <PasswordField form={form} name="password" label="Password" placeholder="••••••••" />
          <label className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2 text-sm text-muted-foreground">
            <input type="checkbox" className="size-4 rounded border-border" {...form.register("rememberMe")} />
            Keep me signed in on this device
          </label>
          {serverError ? <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{serverError}</p> : null}
          <SubmitButton className="w-full" isLoading={form.formState.isSubmitting} type="submit">
            Continue to workspace
          </SubmitButton>
        </form>
      </Form>
    </AuthCard>
  );
}

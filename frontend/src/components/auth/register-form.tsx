"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthCard } from "@/components/auth/auth-card";
import { PasswordField } from "@/components/forms/password-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { Form } from "@/components/ui/form";
import { useAuth } from "@/providers/auth-provider";
import { ApiError } from "@/lib/api/errors";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas";

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);

    try {
      await register({ email: values.email, password: values.password });
      toast.success("Account created. Sign in to continue.");
      router.replace(`/login?registered=1&email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "We couldn't create your account right now.";
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      description="Set up your user identity first. Organizations, roles, and permissions are resolved after sign-in from the backend."
      footer={
        <p className="text-sm text-muted-foreground">
          Already have access?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in instead
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <TextField form={form} name="email" label="Work email" placeholder="controller@company.com" type="email" />
          <PasswordField form={form} name="password" label="Password" description="Use at least 8 characters." placeholder="Create a password" />
          <PasswordField form={form} name="confirmPassword" label="Confirm password" placeholder="Repeat your password" />
          {serverError ? <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{serverError}</p> : null}
          <SubmitButton className="w-full" isLoading={form.formState.isSubmitting} type="submit">
            Create account
          </SubmitButton>
        </form>
      </Form>
    </AuthCard>
  );
}

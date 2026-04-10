"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

const loginSchema = yup.object({
  email: yup
    .string()
    .required("Email is required.")
    .email("Enter a valid email address."),
  password: yup
    .string()
    .required("Password is required.")
    .min(6, "Password must be at least 6 characters."),
});

type LoginFields = yup.InferType<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";

  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFields>({
    resolver: yupResolver(loginSchema),
  });

  async function onSubmit(data: LoginFields) {
    setServerError("");
    try {
      await axios.post("/api/auth/login", data);
      router.refresh(); // re-read the new Supabase session before navigating
      router.push(from);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setServerError(err.response.data.error);
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@relaypay.io"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {serverError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Image
            src="/relaypay_logo_holu.png"
            alt="RelayPay"
            width={160}
            height={44}
            className="object-contain"
            priority
          />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Support Admin</CardTitle>
            <CardDescription>
              Sign in to access the support dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-40" />}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          RelayPay Support Dashboard &mdash; Admin access only
        </p>
      </div>
    </div>
  );
}

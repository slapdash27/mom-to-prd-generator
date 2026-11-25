"use client";

import {
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { Header } from "@/components/header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TeamAuthVerifyResponse } from "@/types/prd";

interface TeamAccessGateProps {
  onVerified: (token: string) => void;
}

export function TeamAccessGate({ onVerified }: TeamAccessGateProps) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as TeamAuthVerifyResponse;

      if (!response.ok || !data.ok || typeof data.token !== "string") {
        setError(data.error ?? "Gagal memverifikasi password tim. Coba lagi.");
        return;
      }

      onVerified(data.token);
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-muted/30">
      <Header />
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center border-b text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LockKeyhole className="size-5" />
            </div>
            <CardTitle className="text-lg">Akses Khusus Tim</CardTitle>
            <CardDescription>
              Masukkan password tim untuk membuka workspace MoM-to-PRD
              Generator.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="flex flex-col gap-4 pt-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="team-password" className="text-sm font-medium">
                  Password / PIN tim
                </label>
                <input
                  id="team-password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Masukkan password tim"
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {error ? (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" size="lg" disabled={isSubmitting || !password}>
                {isSubmitting ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <ShieldCheck />
                )}
                {isSubmitting ? "Memverifikasi..." : "Buka Workspace"}
              </Button>
            </CardContent>
          </form>
        </Card>
      </main>
    </div>
  );
}

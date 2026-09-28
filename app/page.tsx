"use client";

import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";

export default function HomePage() {
  const { user, isAuthenticated, isLoading, error, logout } = useAuthStore();

  return (
    <DashboardShell activePath="/">
      <div className="max-w-4xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">HHIP</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Hybrid Hardware Integration Platform
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted">
          A modern engineering workspace for physical, virtual, and simulated hardware — in one
          product.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/laboratory/workspace">
            <Button size="lg">Open Laboratory ★</Button>
          </Link>
          <Link href="/workspace">
            <Button size="lg" variant="secondary">
              Projects
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="ghost">
              Research Dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-8 max-w-md">
          <Card className="p-5">
            {isAuthenticated && user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {user.picture_url ? (
                    <img
                      src={user.picture_url}
                      alt={user.display_name}
                      className="h-12 w-12 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {user.display_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{user.display_name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="size-3.5" />
                  Authenticated with backend JWT
                </div>

                <Button variant="secondary" className="w-full" onClick={logout}>
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Sign in to HHIP</p>
                  <p className="mt-1 text-xs text-muted">
                    Use your Google account to restore your workspace session securely.
                  </p>
                </div>

                {error ? (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                    {error}
                  </div>
                ) : null}

                <GoogleSignInButton disabled={isLoading} />
              </div>
            )}
          </Card>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            ["Workspace", "Infinite canvas, wires, devices"],
            ["Simulation", "Live sensors, serial, events"],
            ["Hybrid", "Physical + virtual together"],
          ].map(([title, body]) => (
            <Card key={title} className="p-4">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-xs text-muted">{body}</p>
            </Card>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

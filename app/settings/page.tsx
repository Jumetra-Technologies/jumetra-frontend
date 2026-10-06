import { Palette } from "lucide-react";
import { DashboardShell } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { ThemeSettings } from "@/components/theme/theme-settings";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { API_BASE } from "@/lib/api-client";

export default function SettingsPage() {
  return (
    <DashboardShell activePath="/settings">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h2>
      <p className="mt-2 text-muted">
        Platform preferences, appearance, and API endpoints.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Palette className="size-4 shrink-0 text-muted" aria-hidden />
            Appearance
          </h3>
          <p className="mt-1 text-xs text-muted">
            Light is the default. Choose a chrome and canvas palette for the whole platform.
          </p>
          <div className="mt-4">
            <ThemeSettings />
          </div>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-foreground">Platform</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">API URL</dt>
              <dd className="mt-0.5 font-mono text-foreground">
                {API_BASE}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Workspace product</dt>
              <dd className="mt-0.5 text-foreground">HHIP Engineering Laboratory</dd>
            </div>
            <div>
              <dt className="text-muted">Account</dt>
              <dd className="mt-2">
                <SignOutButton />
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </DashboardShell>
  );
}

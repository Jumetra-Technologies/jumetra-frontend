import type { ReactNode } from "react";
import type { AppInfo, Appearance, AuthState } from "@kiungo/api";
import { LogIn } from "lucide-react";
import { Button } from "@kiungo/ui/button";
import { SegmentedControl } from "@kiungo/ui/segmented-control";
import { Avatar } from "../account/AccountMenu";
import { invoke } from "../ipc";
import { PageTitle } from "../shell/widgets";
import type { UpdateControls } from "../update/useUpdate";
import { APPEARANCE_OPTIONS, PLATFORM_NAMES, UpdateRow } from "./SettingsDialog";
import { PrivacySettings } from "./PrivacySettings";
import { Row } from "./Row";

/**
 * Settings: one column, four groups, only settings that do something (Apple:
 * "minimize the number of settings"; Microsoft: at most four or five, short
 * headers, About and updates at the bottom). Anything you change while you
 * work (the lab's view, snapping, the code pane) stays where you do it.
 */
export const SETTINGS_GROUPS = ["Account", "Appearance", "Privacy", "About"] as const;

export function SettingsPage({
  auth,
  appearance,
  onAppearance,
  update,
  info,
}: {
  auth: AuthState | null;
  appearance: Appearance;
  onAppearance: (next: Appearance) => void;
  update: UpdateControls | null;
  info: AppInfo | null;
}) {
  const signedIn = auth?.status === "signed-in" ? auth : null;
  return (
    <div className="mx-auto max-w-[720px] p-6" data-testid="settings-page">
      <PageTitle title="Settings" detail="Your account, how Kiungo looks, your privacy, and updates." />
      <div className="flex flex-col gap-7">
        <Group id="account" title="Account">
          {signedIn ? (
            <>
              <Row title="Profile" detail="From the account you signed in with" testId="settings-profile">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={signedIn.user.name} photo={signedIn.user.photoUrl} className="size-9" />
                  <div className="min-w-0 text-right">
                    <p className="truncate text-[13.5px] font-semibold text-foreground">{signedIn.user.name}</p>
                    <p className="truncate text-[12.5px] text-muted">{signedIn.user.email}</p>
                  </div>
                </div>
              </Row>
              <Row
                title="Signed in"
                detail={[
                  `On ${signedIn.deviceName}`,
                  signedIn.offline ? "Offline: checked again once this computer's back online" : null,
                  !signedIn.secureStorage ? "No keychain on this computer: sign in again each time Kiungo opens" : null,
                ]
                  .filter(Boolean)
                  .join(". ")}
              >
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void invoke("auth:sign-out").then(() => invoke("auth:sign-in"))} data-testid="settings-switch-account">
                    Switch account
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => void invoke("auth:sign-out")} data-testid="settings-sign-out">
                    Sign out
                  </Button>
                </div>
              </Row>
            </>
          ) : (
            <Row title="Not signed in" detail="Everything works without an account. Sign in to sync projects and open them on another computer.">
              <Button size="sm" onClick={() => void invoke("auth:sign-in")} data-testid="settings-sign-in">
                <LogIn className="size-3.5" aria-hidden />
                Sign in
              </Button>
            </Row>
          )}
        </Group>

        <Group id="appearance" title="Appearance">
          <Row title="Theme" detail="Light, dark, or your computer's own setting">
            <SegmentedControl value={appearance} options={APPEARANCE_OPTIONS} onChange={onAppearance} label="Theme" />
          </Row>
        </Group>

        <Group id="privacy" title="Privacy">
          <PrivacySettings signedIn={!!signedIn} />
        </Group>

        <Group id="about" title="About">
          <Row title={`Kiungo ${info?.appVersion ?? update?.info?.currentVersion ?? "…"}${update?.info?.channel === "beta" ? " beta" : ""}`} detail={info ? `${PLATFORM_NAMES[info.platform] ?? info.platform} · ${info.arch}` : "Checking…"} testId="settings-version">
            {update?.info ? <UpdateRow update={update} info={update.info} /> : null}
          </Row>
        </Group>
      </div>
    </div>
  );
}

/** A group of settings under a one-word header, in one card. */
function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`settings-${id}`} data-testid={`settings-group-${id}`}>
      <h2 id={`settings-${id}`} className="mb-2 text-[13px] font-semibold text-muted">
        {title}
      </h2>
      <div className="rounded-[14px] border border-border bg-surface px-4">{children}</div>
    </section>
  );
}

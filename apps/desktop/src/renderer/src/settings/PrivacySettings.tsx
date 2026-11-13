import { useCallback, useEffect, useState } from "react";
import type { PrivacyChoices } from "@kiungo/api";
import { Button } from "@kiungo/ui/button";
import { invoke } from "../ipc";
import { Toggle } from "../shell/widgets";
import { Row } from "./Row";

/** The website's privacy policy, which says what usage counting records (opened in the browser). */
export const PRIVACY_POLICY_URL = "https://jumetra-frontendv0.vercel.app/legal/privacy";

type Load = { status: "loading" } | { status: "ready"; choices: PrivacyChoices } | { status: "failed"; message: string };

/**
 * Usage counting, saved on the account: the same answer the website's banner
 * asks for, so it holds on every computer and in the browser. Signed out,
 * the desktop app counts nothing, so there's nothing to choose.
 */
export function PrivacySettings({ signedIn }: { signedIn: boolean }) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(
    () =>
      invoke("privacy:get").then(
        (choices): Load => ({ status: "ready", choices }),
        (e: unknown): Load => ({ status: "failed", message: e instanceof Error ? e.message : "Your privacy choices couldn't be loaded." }),
      ),
    [],
  );

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    void ask().then((next) => live && setLoad(next));
    return () => {
      live = false;
    };
  }, [signedIn, ask]);

  const retry = () => {
    setLoad({ status: "loading" });
    void ask().then(setLoad);
  };

  const change = (allowed: boolean) => {
    setSaving(true);
    setError(null);
    invoke("privacy:set-usage", allowed).then(
      (choices) => {
        setLoad({ status: "ready", choices });
        setSaving(false);
      },
      (e: unknown) => {
        setError(e instanceof Error ? e.message : "That didn't save. Try again.");
        setSaving(false);
      },
    );
  };

  const on = load.status === "ready" && load.choices.usage === true;
  const detail = !signedIn
    ? "Signed out, nothing is counted. Sign in to choose."
    : load.status === "loading"
      ? "Checking your account…"
      : load.status === "failed"
        ? load.message
        : load.choices.usage === null
          ? "Not chosen yet, so nothing is counted. When on: which screen is open and for how long, never what's in it."
          : on
            ? "On: which screen is open and for how long, never what's in it. Turning it off deletes what was counted."
            : "Off: nothing is counted.";

  return (
    <>
      <Row title="Count how I use Kiungo" detail={detail} testId="settings-usage">
        {signedIn && load.status === "failed" ? (
          <Button size="sm" variant="secondary" onClick={retry} data-testid="settings-usage-retry">
            Try again
          </Button>
        ) : (
          <Toggle on={on} onChange={change} label="Count how I use Kiungo" disabled={!signedIn || load.status !== "ready" || saving} />
        )}
      </Row>
      {error ? (
        <p role="alert" className="-mt-1 pb-3 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}
      <Row title="Privacy policy" detail="What Kiungo keeps, for how long, and why">
        <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-primary hover:underline">
          Read it
        </a>
      </Row>
    </>
  );
}

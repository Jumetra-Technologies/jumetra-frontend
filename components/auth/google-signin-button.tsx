"use client";

import { SocialSignInButton } from "@/components/auth/social-signin-button";

export function GoogleSignInButton({
  disabled = false,
  label = "Continue with Google",
  onSignedIn,
  className,
}: {
  disabled?: boolean;
  label?: string;
  onSignedIn?: () => void;
  className?: string;
}) {
  return (
    <SocialSignInButton
      provider="google"
      disabled={disabled}
      label={label}
      onSignedIn={onSignedIn}
      className={className}
    />
  );
}

"use client";

import { SocialSignInButton } from "@/components/auth/social-signin-button";

export function GitHubSignInButton({
  disabled = false,
  label = "Continue with GitHub",
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
      provider="github"
      disabled={disabled}
      label={label}
      onSignedIn={onSignedIn}
      className={className}
    />
  );
}

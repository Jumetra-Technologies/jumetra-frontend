"use client";

import { useState } from "react";
import { initialsOf, sizedPhoto } from "@/lib/profile";
import { cn } from "@/lib/utils";

/**
 * The user's Google photo, or their initials if there's no photo or it
 * fails to load. Google photo URLs refuse requests that send a referrer, so
 * none is sent.
 */
export function Avatar({ name, src, size = 32, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const url = sizedPhoto(src, size);
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = Boolean(url) && failed !== url;
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) };

  if (showPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Google photo; next/image would need the host allow-listed and adds nothing at this size
      <img
        src={url!}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        decoding="async"
        onError={() => setFailed(url)}
        className={cn("shrink-0 rounded-full bg-muted-bg object-cover ring-1 ring-black/5", className)}
        style={style}
        data-testid="avatar-photo"
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground", className)}
      style={style}
      data-testid="avatar-initials"
    >
      {initialsOf(name)}
    </span>
  );
}

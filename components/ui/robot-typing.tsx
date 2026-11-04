"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import styles from "./robot-typing.module.css";

/** A typing bubble that turns into Kiungo's robot, says something, and turns back: a 5.75 s loop. */
const SRC = "/animations/robot-typing.json";
/** The robot's face, talking: what people who ask for less motion see, held still. */
const STILL_FRAME = 240;

/** Fetched once per page, however many robots are showing. */
let animation: Promise<object> | null = null;
const loadAnimation = () =>
  (animation ??= fetch(SRC)
    .then((r) => (r.ok ? (r.json() as Promise<object>) : Promise.reject(new Error(`${r.status}`))))
    .catch((error: unknown) => {
      animation = null; // try again next time one is shown
      throw error;
    }));

/**
 * Kiungo's robot typing a message: for the moments the app is working on an
 * answer (a build, a run starting) or has something to say (an error).
 * Decorative: the words beside it say what's happening. It plays in the
 * theme's primary color, and holds still for people who ask for less motion.
 * Until it loads (or if it can't), the space stays empty at the same size.
 */
export function RobotTyping({ className, testId = "robot-typing" }: { className?: string; testId?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = box.current;
    if (!container) return;
    let gone = false;
    let player: { destroy: () => void } | null = null;
    const calm = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void Promise.all([import("lottie-web/build/player/lottie_light"), loadAnimation()])
      .then(([lottie, data]) => {
        if (gone) return;
        const anim = lottie.default.loadAnimation({
          container,
          renderer: "svg",
          loop: !calm,
          autoplay: !calm,
          // The player writes into the data it's given, so each robot gets its own copy.
          animationData: structuredClone(data),
          rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true },
        });
        if (calm) anim.addEventListener("DOMLoaded", () => anim.goToAndStop(STILL_FRAME, true));
        player = anim;
      })
      .catch(() => undefined);
    return () => {
      gone = true;
      player?.destroy();
    };
  }, []);
  return <div ref={box} aria-hidden="true" className={cn(styles.robot, "aspect-[52/42]", className)} data-testid={testId} />;
}

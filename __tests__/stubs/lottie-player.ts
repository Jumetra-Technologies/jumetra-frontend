/** Stands in for lottie-web in tests (vitest.config.ts aliases it): records each animation it's asked to play. */
type Player = { options: Record<string, unknown>; goToAndStop: (frame: number, isFrame: boolean) => void; destroy: () => void; calls: { goToAndStop: Array<[number, boolean]>; destroyed: boolean }; loaded?: () => void };

export const players: Player[] = [];

const lottie = {
  loadAnimation(options: Record<string, unknown>) {
    const calls = { goToAndStop: [] as Array<[number, boolean]>, destroyed: false };
    const player: Player = {
      options,
      calls,
      goToAndStop: (frame, isFrame) => void calls.goToAndStop.push([frame, isFrame]),
      destroy: () => void (calls.destroyed = true),
    };
    players.push(player);
    return {
      addEventListener: (_event: string, cb: () => void) => void (player.loaded = cb),
      goToAndStop: player.goToAndStop,
      destroy: player.destroy,
    };
  },
};

export default lottie;

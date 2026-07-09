declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined" || !GA_MEASUREMENT_ID || !window.gtag) {
    return;
  }

  window.gtag("event", name, params);
}

export const SimEvents = {
  pageView: () => trackEvent("sim_page_view"),
  tutorialComplete: () => trackEvent("sim_tutorial_complete"),
  tutorialSkip: () => trackEvent("sim_tutorial_skip"),
  cycleSubmit: (cycle: number) => trackEvent("sim_cycle_submit", { cycle }),
  win: (cyclesToWin: number) =>
    trackEvent("sim_win", { cycles_to_win: cyclesToWin }),
  loss: (attemptsRemaining: number) =>
    trackEvent("sim_loss", { attempts_remaining: attemptsRemaining }),
  attemptsExhausted: () => trackEvent("sim_attempts_exhausted"),
  shareDownload: (variant: "win" | "loss") =>
    trackEvent("sim_share_download", { variant }),
  shareNative: (variant: "win" | "loss") =>
    trackEvent("sim_share_native", { variant }),
} as const;

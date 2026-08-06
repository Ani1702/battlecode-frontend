"use client";

import { useEffect, useId, useState } from "react";
import {
  buildShareText,
  canvasToBlob,
  downloadBlob,
  GAME_URL,
  nativeShare,
  renderShareCanvas,
} from "./shareCanvas";
import { Download, Instagram, Share2, X, type LucideIcon } from "lucide-react";
import { SimEvents } from "@/lib/analytics";

const INSTAGRAM_URL =
  "https://www.instagram.com/ieeecs_vit?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

type EndVariant = "win" | "loss";

const HOW_IT_WORKS_SECTIONS = [
  {
    title: "Head-to-Head Battles",
    body: "Race against another participant to solve the same coding problem before they do.",
  },
  {
    title: "Ranked Matchmaking",
    body: "Win matches, climb the ranks, and take on stronger opponents as you improve.",
  },
  {
    title: "Challenges for Everyone",
    body: "Whether you're solving your first coding problem or you're an experienced competitive programmer, BattleCode is designed to be fun, fair, and exciting.",
  },
  {
    title: "Multiple Competitive Rounds",
    body: "Every stage introduces new challenges, strategies, and tougher opponents until only the best remain.",
  },
  {
    title: "Real-Time Competition",
    body: "Every second counts. Think fast. Code faster.",
  },
] as const;

const WHY_YOU_LOVE = [
  "Face real opponents instead of just solving problems alone.",
  "Improve your coding under pressure.",
  "Climb the leaderboard and prove your skills.",
  "Earn bragging rights and exciting prizes.",
  "Experience coding like never before.",
] as const;

export default function EndScreen({
  variant,
  cyclesToWin,
  playerLivesRemaining,
  shareEventDate,
  onRetry,
}: {
  variant: EndVariant;
  cyclesToWin?: number;
  playerLivesRemaining?: number;
  shareEventDate: string;
  onRetry?: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const titleId = useId();
  const analyticsVariant = variant;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    renderShareCanvas({
      variant,
      cyclesToWin,
      playerLivesRemaining,
      shareEventDate,
    })
      .then((canvas) => {
        if (cancelled) {
          return;
        }

        objectUrl = canvas.toDataURL("image/png");
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl(null);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [variant, cyclesToWin, playerLivesRemaining, shareEventDate]);

  useEffect(() => {
    if (!overlayOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOverlayOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!comingSoonVisible) {
      return;
    }

    const timer = window.setTimeout(() => {
      setComingSoonVisible(false);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [comingSoonVisible]);

  const handleRegister = () => {
    setComingSoonVisible(true);
    SimEvents.registerComingSoon(analyticsVariant);
  };

  const handleOpenHowItWorks = () => {
    setOverlayOpen(true);
    SimEvents.howItWorksOpen(analyticsVariant);
  };

  const handleDownload = async () => {
    const canvas = await renderShareCanvas({
      variant,
      cyclesToWin,
      playerLivesRemaining,
      shareEventDate,
    });
    const blob = await canvasToBlob(canvas);
    downloadBlob(blob, `battlecode-${variant}.png`);
    SimEvents.shareDownload(variant);
  };

  const handleShare = async () => {
    const canvas = await renderShareCanvas({
      variant,
      cyclesToWin,
      playerLivesRemaining,
      shareEventDate,
    });
    const blob = await canvasToBlob(canvas);
    const shared = await nativeShare(blob, "BattleCode");

    if (shared) {
      SimEvents.shareNative(variant);
      return;
    }

    setShareHint(
      `Sharing isn't supported here. Download the image, then send: ${buildShareText()}`,
    );
  };

  return (
    <>
      <div className="glass-box rounded-lg p-3 sm:p-5">
        <div className="relative flex items-start justify-center">
          <p className="text-center text-[0.65rem] font-medium uppercase tracking-[0.2em] text-orange-300/90 sm:text-xs">
            Welcome to BattleCode
          </p>
          <button
            type="button"
            onClick={handleOpenHowItWorks}
            className="absolute right-0 top-0 text-[0.65rem] uppercase tracking-wider text-white/60 transition hover:text-orange-300 sm:text-xs"
          >
            Know more
          </button>
        </div>

        <h2 className="orbitron mt-1.5 text-center text-lg sm:mt-2 sm:text-2xl">
          {variant === "win" ? "Victory" : "Mission Report"}
        </h2>

        <div className="mx-auto mt-3 max-w-[min(22rem,88vw)] overflow-hidden rounded-lg border border-white/10 bg-black/40 sm:mt-4 sm:max-w-[24rem]">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="BattleCode share card preview"
              className="h-auto max-h-[42dvh] w-full object-contain sm:max-h-[50dvh]"
            />
          ) : (
            <div className="flex aspect-[9/16] max-h-[42dvh] items-center justify-center text-xs text-white/50 sm:max-h-[50dvh]">
              Generating share card...
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-orange-300/90 sm:text-sm">
          {GAME_URL.replace(/^https?:\/\//, "")}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:mt-4 sm:gap-4">
          <ShareActionButton
            icon={Download}
            label="Download share card"
            onClick={handleDownload}
          />
          <ShareActionButton
            icon={Share2}
            label="Share"
            onClick={handleShare}
          />
          <ShareActionButton
            icon={Instagram}
            label="Follow IEEE CS VIT on Instagram"
            href={INSTAGRAM_URL}
          />
        </div>

        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="gradient-border-button mx-auto mt-4 block w-auto min-w-[12rem] max-w-[16rem] px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white sm:mt-5 sm:py-3.5 sm:text-base"
          >
            Retry
          </button>
        ) : null}

        {comingSoonVisible ? (
          <p
            className="mt-2 text-center text-xs font-medium uppercase tracking-wider text-orange-300"
            role="status"
          >
            Coming soon
          </p>
        ) : null}

        {shareHint ? (
          <p className="mt-2 whitespace-pre-line text-center text-[0.65rem] leading-snug text-white/60 sm:mt-3 sm:text-sm">
            {shareHint}
          </p>
        ) : null}
      </div>

      {overlayOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setOverlayOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="glass-box flex max-h-[min(640px,92vh)] w-full max-w-md flex-col overflow-hidden rounded-xl shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[0.65rem] uppercase tracking-wider text-white/50">
                  About the event
                </p>
                <h2
                  id={titleId}
                  className="orbitron mt-1 text-lg leading-tight"
                >
                  How BattleCode works
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOverlayOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-left">
              <p className="text-sm leading-relaxed text-white/80">
                The minigame was just a warm-up. BattleCode is a competitive
                coding tournament where you&apos;ll face real opponents, solve
                programming challenges under pressure, climb the leaderboard,
                and battle your way to the top.
              </p>

              <ul className="mt-5 space-y-4">
                {HOW_IT_WORKS_SECTIONS.map((section) => (
                  <li key={section.title}>
                    <h3 className="orbitron text-sm text-orange-300/95">
                      {section.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/70">
                      {section.body}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-white/10 pt-4">
                <h3 className="orbitron text-sm text-orange-300/95">
                  Why you&apos;ll love BattleCode
                </h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-white/70">
                  {WHY_YOU_LOVE.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <h3 className="orbitron text-sm text-orange-300/95">
                  Beginner friendly?
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-white/70">
                  Absolutely. If you know the basics of programming, you&apos;re
                  ready to compete. Ranked matchmaking helps keep battles
                  balanced and competitive for everyone.
                </p>
              </div>

              <p className="mt-6 text-center text-[0.65rem] uppercase tracking-[0.25em] text-white/45">
                Play · Battle · Climb · Adapt · Conquer
              </p>
            </div>

            <div className="shrink-0 border-t border-white/10 px-4 py-3 text-center">
              <button
                type="button"
                onClick={handleRegister}
                className="gradient-border-button mx-auto block w-auto min-w-[12rem] max-w-[18rem] px-8 py-2.5 text-sm font-semibold uppercase tracking-widest text-white"
              >
                Register for BattleCode
              </button>
              {comingSoonVisible ? (
                <p
                  className="mt-2 text-xs font-medium uppercase tracking-wider text-orange-300"
                  role="status"
                >
                  Coming soon
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ShareActionButton({
  icon: Icon,
  label,
  onClick,
  href,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <Icon
      className="h-5 w-5 text-white sm:h-6 sm:w-6"
      strokeWidth={1.75}
      aria-hidden
    />
  );

  const className =
    "inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 transition hover:bg-white/10 hover:opacity-90 active:scale-95 sm:h-10 sm:w-10";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={label}
        title={label}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={label}
      title={label}
    >
      {content}
    </button>
  );
}

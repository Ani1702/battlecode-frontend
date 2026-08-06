"use client";

import { useEffect, useState } from "react";
import {
  buildShareText,
  canvasToBlob,
  downloadBlob,
  GAME_URL,
  nativeShare,
  renderShareCanvas,
} from "./shareCanvas";
import { Download, Instagram, Share2, type LucideIcon } from "lucide-react";
import { SimEvents } from "@/lib/analytics";

const INSTAGRAM_URL =
  "https://www.instagram.com/ieeecs_vit?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

export default function ShareCard({
  variant,
  cyclesToWin,
  playerLivesRemaining,
  shareEventDate,
  onRetry,
}: {
  variant: "win" | "loss";
  cyclesToWin?: number;
  playerLivesRemaining?: number;
  shareEventDate: string;
  onRetry?: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const canRetry = Boolean(onRetry);

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
    <div className="glass-box rounded-lg p-3 sm:p-5">
      <h2 className="orbitron text-center text-lg sm:text-2xl">
        {variant === "win" ? "Victory" : "Mission Report"}
      </h2>

      <div className="mx-auto mt-3 max-w-[min(22rem,88vw)] overflow-hidden rounded-lg border border-white/10 bg-black/40 sm:mt-4 sm:max-w-[24rem]">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="BattleCode share card preview"
            className="h-auto max-h-[50dvh] w-full object-contain sm:max-h-[58dvh]"
          />
        ) : (
          <div className="flex aspect-[9/16] max-h-[50dvh] items-center justify-center text-xs text-white/50 sm:max-h-[58dvh]">
            Generating share card...
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-orange-300/90 sm:text-sm">
        {GAME_URL.replace(/^https?:\/\//, "")}
      </p>

      {canRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="gradient-border-button mx-auto mt-4 block w-auto min-w-[12rem] max-w-[16rem] px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white sm:mt-5 sm:py-3.5 sm:text-base"
        >
          Retry
        </button>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:mt-4 sm:gap-4">
        <ShareActionButton
          icon={Download}
          label="Download share card"
          onClick={handleDownload}
        />
        <ShareActionButton icon={Share2} label="Share" onClick={handleShare} />
        <ShareActionButton
          icon={Instagram}
          label="Follow IEEE CS VIT on Instagram"
          href={INSTAGRAM_URL}
        />
      </div>

      {shareHint ? (
        <p className="mt-2 whitespace-pre-line text-center text-[0.65rem] leading-snug text-white/60 sm:mt-3 sm:text-sm">
          {shareHint}
        </p>
      ) : null}
    </div>
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

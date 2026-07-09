"use client";

import { useEffect, useState } from "react";
import {
  canvasToBlob,
  downloadBlob,
  nativeShare,
  renderShareCanvas,
} from "./shareCanvas";
import { SimEvents } from "@/lib/analytics";

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
    const shared = await nativeShare(blob, "BattleCode Simulation");

    if (shared) {
      SimEvents.shareNative(variant);
      return;
    }

    setShareHint(
      "Sharing is not supported here. Download the image and upload it to your story.",
    );
  };

  return (
    <div className="glass-box rounded-lg p-6">
      <h2 className="orbitron text-center text-2xl">
        {variant === "win" ? "Victory" : "Mission Report"}
      </h2>

      <div className="mx-auto mt-6 max-w-xs overflow-hidden rounded-lg border border-white/10 bg-black/40">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="BattleCode share card preview"
            className="h-auto w-full"
          />
        ) : (
          <div className="flex aspect-[9/16] items-center justify-center text-sm text-white/50">
            Generating share card...
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="gradient-border-button px-6 py-2 text-sm uppercase tracking-wider"
        >
          Download
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="gradient-border-button px-6 py-2 text-sm uppercase tracking-wider"
        >
          Share
        </button>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-white/20 px-6 py-2 text-sm uppercase tracking-wider text-white/80"
          >
            Retry
          </button>
        ) : null}
      </div>

      {shareHint ? (
        <p className="mt-4 text-center text-sm text-white/60">{shareHint}</p>
      ) : null}
    </div>
  );
}

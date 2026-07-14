"use client";

import Image from "next/image";
import { useState } from "react";

export const INSTAGRAM_URL =
  "https://www.instagram.com/ieeecs_vit?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

const QR_NO_BG = "/battlecode_qr_nobg.png";
const QR_FALLBACK = "/battlecode_qr.png";

export function QrPromoBanner({
  compact = false,
  inline = false,
}: {
  compact?: boolean;
  inline?: boolean;
}) {
  const [qrSrc, setQrSrc] = useState(QR_NO_BG);

  return (
    <div
      className={[
        "flex shrink-0 items-center",
        inline ? "gap-2" : "flex-col gap-1.5 text-center",
      ].join(" ")}
    >
      <div
        className={[
          "relative shrink-0",
          compact ? "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" : "h-24 w-24",
        ].join(" ")}
      >
        <Image
          src={qrSrc}
          alt="BattleCode QR code"
          fill
          className="object-contain"
          sizes={compact ? "72px" : "96px"}
          onError={() => {
            if (qrSrc !== QR_FALLBACK) {
              setQrSrc(QR_FALLBACK);
            }
          }}
        />
      </div>
      {!inline ? (
        <p
          className={[
            "font-medium uppercase tracking-wider text-white/70",
            compact ? "text-[0.55rem]" : "text-[0.65rem]",
          ].join(" ")}
        >
          Scan to play
        </p>
      ) : null}
    </div>
  );
}

export function InstagramButton({
  compact = false,
  small = false,
  iconOnly = false,
}: {
  compact?: boolean;
  small?: boolean;
  iconOnly?: boolean;
}) {
  const iconClass = iconOnly
    ? "h-4 w-4"
    : small
      ? "h-3 w-3"
      : compact
        ? "h-3.5 w-3.5"
        : "h-4 w-4";

  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "gradient-border-button inline-flex items-center justify-center text-white transition hover:opacity-90",
        iconOnly
          ? "h-8 w-8 sm:h-9 sm:w-9"
          : [
              "font-semibold uppercase tracking-wider",
              small
                ? "gap-1 px-2.5 py-1 text-[0.6rem] sm:px-3 sm:py-1.5 sm:text-[0.65rem]"
                : compact
                  ? "gap-1.5 px-4 py-2 text-xs"
                  : "gap-2 px-6 py-2 text-sm",
            ].join(" "),
      ].join(" ")}
      aria-label="Follow IEEE CS VIT on Instagram"
      title="Instagram"
    >
      <InstagramIcon className={iconClass} />
      {iconOnly ? null : "Instagram"}
    </a>
  );
}

/** Landing / footer strip: quote area + QR in open space */
export default function EndPromoBanner({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "flex w-full items-center gap-4 rounded-lg border border-white/10 bg-white/[0.04]",
        compact ? "px-3 py-3" : "glass-box px-4 py-4",
      ].join(" ")}
    >
      <p
        className={[
          "min-w-0 flex-1 leading-relaxed text-white/75",
          compact
            ? "text-[0.65rem] uppercase tracking-[2px]"
            : "text-xs uppercase tracking-[3px]",
        ].join(" ")}
      >
        Scan the QR to play BattleCode on your phone.
      </p>
      <QrPromoBanner compact={compact} inline />
    </div>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

// ColoredBtn.tsx
"use client";
import { ReactNode } from "react";

interface ColoredBtnProps {
  onClick?: () => void;
  content: string;
  selected?: boolean;
}

export default function ColoredBtn({
  onClick,
  content,
  selected = false,
}: ColoredBtnProps) {
  return (
    <button
      className={`px-4 py-2 rounded-lg font-oxanium ${
        selected
          ? "bg-amber-600 text-white"
          : "bg-amber-900 text-amber-300 hover:bg-amber-800"
      } transition-colors`}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

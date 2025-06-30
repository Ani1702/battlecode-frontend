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
      className={` rounded-lg text-2xl font-oxanium p-4 ${
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

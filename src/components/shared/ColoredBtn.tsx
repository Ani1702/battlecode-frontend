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
      className={`rounded-lg text-2xl font-oxanium p-4 ${
        selected
          ? "bg-[linear-gradient(90deg,rgba(244,98,60,0.6)_0%,rgba(245,0,0,0.6)_100%)] text-white"
          : "bg-[linear-gradient(90deg,#F4623C_0%,#C63128_100%)] text-white "
      } transition-all duration-300 hover:bg-[linear-gradient(90deg,rgba(244,98,60,0.6)_0%,rgba(245,0,0,0.6)_100%)]`}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

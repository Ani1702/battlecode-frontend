// ColoredBtn.tsx
"use client";
// import { ReactNode } from "react";

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
        selected ? "bg-orange-800 text-white" : "bg-orange-600 text-white "
      } transition-all duration-300 hover:bg-orange-800/80`}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

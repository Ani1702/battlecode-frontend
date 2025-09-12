"use client";
import { RoundProvider } from "@/contexts/RoundContext";
import { ReactNode } from "react";

export default function Round0Layout({ children }: { children: ReactNode }) {

  return <RoundProvider>{children}</RoundProvider>;
}
"use client";
import { createContext, useContext, useState, ReactNode } from "react";

// Define the shape of the data we will store
interface Problem {
  id: string;
  title?: string;
  description?: string;
  difficulty?: string;
  constraints?: string[];
  hints?: string[];
  [key: string]: unknown;
}

interface RoundData {
  problems: Problem[];
  duration: number;
  startTime: number;
}

interface IRoundContext {
  roundData: RoundData | null;
  setRoundData: (data: RoundData | null) => void;
}

const RoundContext = createContext<IRoundContext | null>(null);

export const RoundProvider = ({ children }: { children: ReactNode }) => {
  const [roundData, setRoundData] = useState<RoundData | null>(null);

  return (
    <RoundContext.Provider value={{ roundData, setRoundData }}>
      {children}
    </RoundContext.Provider>
  );
};

export const useRound = () => {
  const context = useContext(RoundContext);
  if (!context) {
    throw new Error("useRound must be used within a RoundProvider");
  }
  return context;
};

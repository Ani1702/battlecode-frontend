"use client";

import { FormEvent, useState } from "react";
import { isValidInstruction } from "@/game/engine/parser";

export default function TurnInputPlain({
  disabled,
  onSubmit,
  error,
}: {
  disabled: boolean;
  onSubmit: (value: string) => void;
  error: string | null;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidInstruction(value)) {
      return;
    }

    onSubmit(value);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="glass-box rounded-lg p-4">
      <label className="mb-2 block text-sm uppercase tracking-wider text-white/70">
        Your instruction
      </label>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        placeholder="MOVE(UP)"
        className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 font-mono text-sm outline-none focus:border-orange-500"
      />
      <p className="mt-2 text-xs text-white/50">
        Valid: MOVE(UP|DOWN|LEFT|RIGHT), ATTACK(...), SHIELD()
      </p>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={disabled || !isValidInstruction(value)}
        className="gradient-border-button mt-4 px-6 py-2 text-sm uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
      >
        Submit
      </button>
    </form>
  );
}

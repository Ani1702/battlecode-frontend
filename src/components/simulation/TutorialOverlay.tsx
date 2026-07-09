"use client";

import { useState } from "react";
import { TUTORIAL_STEPS } from "./tutorialSteps";

export default function TutorialOverlay({
  onComplete,
  onSkip,
}: {
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = TUTORIAL_STEPS[stepIndex];
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      return;
    }

    setStepIndex((current) => current + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass-box w-full max-w-lg rounded-lg p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-wider text-white/50">
            Tutorial {stepIndex + 1}/{TUTORIAL_STEPS.length}
          </p>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm uppercase tracking-wider text-white/60 hover:text-white"
          >
            Skip
          </button>
        </div>

        <h2 className="orbitron text-2xl">{step.title}</h2>
        <p className="mt-4 text-white/80">{step.body}</p>
        {step.hint ? (
          <p className="mt-4 font-mono text-sm text-orange-300">{step.hint}</p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleNext}
            className="gradient-border-button px-6 py-2 text-sm uppercase tracking-wider"
          >
            {isLastStep ? "Start" : "Next"}
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {TUTORIAL_STEPS.map((_, index) => (
            <span
              key={index}
              className={`h-2 w-2 rounded-full ${
                index === stepIndex ? "bg-orange-400" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

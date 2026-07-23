"use client";

import { useCallback, useEffect, useState } from "react";
import TutorialSandbox from "./TutorialSandbox";
import { TUTORIAL_STEPS } from "./tutorialSteps";

export default function TutorialOverlay({
  onComplete,
  onSkip,
}: {
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [runToken, setRunToken] = useState(0);
  const [stepCompleted, setStepCompleted] = useState(false);
  const [practiceHelperText, setPracticeHelperText] = useState<string | null>(
    null,
  );
  const step = TUTORIAL_STEPS[stepIndex];
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    setStepCompleted(false);
    setPracticeHelperText(
      step.type === "practice" ? (step.helperText ?? null) : null,
    );
  }, [stepIndex, step.type, step.helperText]);

  const cancelRunningDemo = useCallback(() => {
    setRunToken((current) => current + 1);
  }, []);

  const handleNext = useCallback(() => {
    cancelRunningDemo();

    if (isLastStep) {
      onComplete();
      return;
    }

    setStepIndex((current) => current + 1);
  }, [cancelRunningDemo, isLastStep, onComplete]);

  const handleSkip = useCallback(() => {
    cancelRunningDemo();
    onSkip();
  }, [cancelRunningDemo, onSkip]);

  const handleStepCompleted = useCallback(() => {
    setStepCompleted(true);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass-box flex max-h-[min(640px,92vh)] w-full max-w-md flex-col overflow-hidden rounded-xl shadow-2xl">
        <div className="shrink-0 border-b border-white/10 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[0.65rem] uppercase tracking-wider text-white/50">
              Tutorial {stepIndex + 1}/{TUTORIAL_STEPS.length}
            </p>
            <button
              type="button"
              onClick={handleSkip}
              className="text-[0.65rem] uppercase tracking-wider text-white/55 transition hover:text-white"
            >
              Skip
            </button>
          </div>

          <h2 className="orbitron text-lg leading-tight">{step.title}</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/75">
            {step.body}
          </p>
          {step.type === "practice" && practiceHelperText ? (
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              {practiceHelperText}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <TutorialSandbox
            key={`${stepIndex}-${runToken}`}
            step={step}
            runToken={runToken}
            compact
            onStepCompleted={handleStepCompleted}
            onPracticeComplete={
              step.type === "practice" ? handleNext : undefined
            }
            onHelperTextChange={setPracticeHelperText}
          />
        </div>

        <div className="shrink-0 border-t border-white/10 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {TUTORIAL_STEPS.map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full ${
                    index === stepIndex ? "bg-orange-400" : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={!stepCompleted}
              className={[
                "gradient-border-button px-5 py-1.5 text-xs uppercase tracking-wider",
                stepCompleted
                  ? ""
                  : "cursor-not-allowed opacity-40 hover:tracking-wider",
              ].join(" ")}
            >
              {isLastStep ? "Start game" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

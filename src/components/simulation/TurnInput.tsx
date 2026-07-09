"use client";

import Editor, { useMonaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { isValidInstruction } from "@/game/engine/parser";
import {
  LANGUAGE_ID,
  registerInstructionLanguage,
  setPlayableInstructionSuggestions,
} from "./instructionLanguage";

const PLACEHOLDER = "MOVE(LEFT)";

export default function TurnInput({
  disabled,
  onSubmit,
  error,
  playableInstructions,
}: {
  disabled: boolean;
  onSubmit: (value: string) => void;
  error: string | null;
  playableInstructions: string[];
}) {
  const monaco = useMonaco();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const disabledRef = useRef(disabled);
  const onSubmitRef = useRef(onSubmit);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    disabledRef.current = disabled;
    onSubmitRef.current = onSubmit;
  }, [disabled, onSubmit]);

  useEffect(() => {
    setPlayableInstructionSuggestions(playableInstructions);
  }, [playableInstructions]);

  useEffect(() => {
    if (monaco) {
      registerInstructionLanguage(monaco);
      setPlayableInstructionSuggestions(playableInstructions);
    }
  }, [monaco, playableInstructions]);

  useEffect(() => {
    const instance = editorRef.current;
    if (!instance) {
      return;
    }

    instance.updateOptions({ readOnly: disabled });
  }, [disabled]);

  const submitFromEditor = () => {
    const instance = editorRef.current;
    if (!instance || disabledRef.current) {
      return;
    }

    const value = instance.getValue().trim();
    if (!isValidInstruction(value)) {
      return;
    }

    onSubmitRef.current(value);
    instance.setValue("");
    setIsEmpty(true);
  };

  return (
    <div className="glass-box rounded-lg p-4">
      <label className="mb-2 block text-sm uppercase tracking-wider text-white/70">
        Your instruction
      </label>
      <div className="relative overflow-hidden rounded-md border border-white/20 bg-black/40">
        {isEmpty ? (
          <div
            aria-hidden
            className="pointer-events-none absolute left-3 top-3 z-10 font-mono text-sm text-white/30"
          >
            {PLACEHOLDER}
          </div>
        ) : null}
        <Editor
          height="48px"
          language={LANGUAGE_ID}
          theme="battlecode-instruction-dark"
          options={{
            minimap: { enabled: false },
            lineNumbers: "off",
            folding: false,
            glyphMargin: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            scrollBeyondLastLine: false,
            wordWrap: "off",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            renderLineHighlight: "none",
            fontSize: 14,
            fontFamily: "Consolas, monospace",
            padding: { top: 12, bottom: 12 },
            scrollbar: { vertical: "hidden", horizontal: "hidden" },
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
            readOnly: disabled,
          }}
          onMount={(instance, monacoInstance) => {
            editorRef.current = instance;
            registerInstructionLanguage(monacoInstance);
            setPlayableInstructionSuggestions(playableInstructions);

            instance.onDidChangeModelContent(() => {
              const model = instance.getModel();
              if (!model) {
                return;
              }

              const value = model.getValue();
              setIsEmpty(value.length === 0);

              const upper = value.toUpperCase();
              if (value !== upper) {
                const position = instance.getPosition();
                model.setValue(upper);
                if (position) {
                  instance.setPosition(position);
                }
                setIsEmpty(upper.length === 0);
              }
            });

            instance.addCommand(monacoInstance.KeyCode.Enter, () => {
              submitFromEditor();
            });

            instance.addCommand(monacoInstance.KeyCode.Tab, () => {
              instance.trigger("keyboard", "acceptSelectedSuggestion", {});
            });
          }}
        />
      </div>
      <p className="mt-2 text-xs text-white/50">
        Type a command like MOVE(LEFT). Tab picks a valid move · Enter submits
      </p>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <button
        type="button"
        onClick={submitFromEditor}
        disabled={disabled}
        className="gradient-border-button mt-4 px-6 py-2 text-sm uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
      >
        Submit
      </button>
    </div>
  );
}

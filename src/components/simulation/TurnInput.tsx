"use client";

import Editor, { useMonaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef } from "react";
import { isValidInstruction } from "@/game/engine/parser";
import {
  LANGUAGE_ID,
  registerInstructionLanguage,
} from "./instructionLanguage";

export default function TurnInput({
  disabled,
  onSubmit,
  error,
}: {
  disabled: boolean;
  onSubmit: (value: string) => void;
  error: string | null;
}) {
  const monaco = useMonaco();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const disabledRef = useRef(disabled);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    disabledRef.current = disabled;
    onSubmitRef.current = onSubmit;
  }, [disabled, onSubmit]);

  useEffect(() => {
    if (monaco) {
      registerInstructionLanguage(monaco);
    }
  }, [monaco]);

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
  };

  return (
    <div className="glass-box rounded-lg p-4">
      <label className="mb-2 block text-sm uppercase tracking-wider text-white/70">
        Your instruction
      </label>
      <div className="overflow-hidden rounded-md border border-white/20 bg-black/40">
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
        Type to autocomplete · Tab to accept · Enter to submit
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

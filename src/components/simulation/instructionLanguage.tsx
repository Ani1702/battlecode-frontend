import type { Monaco } from "@monaco-editor/react";
import { ALL_DIRECTIONS, INSTRUCTION_STRINGS } from "@/game/engine/constants";
import type { Direction } from "@/game/engine/types";

const LANGUAGE_ID = "battlecode-instruction";

let registered = false;
let playableInstructions: readonly string[] = INSTRUCTION_STRINGS;

export function setPlayableInstructionSuggestions(
  instructions: readonly string[],
): void {
  playableInstructions = instructions;
}

function matchSuggestions(text: string): string[] {
  const normalized = text.trim().toUpperCase();

  if (!normalized) {
    return [...playableInstructions];
  }

  const prefixMatches = playableInstructions.filter((label) =>
    label.startsWith(normalized),
  );
  if (prefixMatches.length > 0) {
    return prefixMatches;
  }

  if (ALL_DIRECTIONS.includes(normalized as Direction)) {
    return playableInstructions.filter((label) =>
      label.includes(`(${normalized})`),
    );
  }

  return [];
}

export function registerInstructionLanguage(monaco: Monaco): void {
  if (registered) {
    return;
  }

  registered = true;

  monaco.languages.register({ id: LANGUAGE_ID });

  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
    tokenizer: {
      root: [[/.*/, "instruction"]],
    },
  });

  monaco.editor.defineTheme("battlecode-instruction-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [{ token: "instruction", foreground: "FDBA74" }],
    colors: {
      "editor.background": "#00000000",
      "editor.lineHighlightBackground": "#00000000",
    },
  });

  monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: "MADSH(".split(""),
    provideCompletionItems: (model) => {
      const text = model.getValue();
      const suggestions = matchSuggestions(text).map((label) => ({
        label,
        kind: monaco.languages.CompletionItemKind.Enum,
        insertText: label,
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: text.length + 1,
        },
      }));

      return { suggestions };
    },
  });
}

export { LANGUAGE_ID };

import type { Monaco } from "@monaco-editor/react";
import { INSTRUCTION_STRINGS } from "@/game/engine/constants";

const LANGUAGE_ID = "battlecode-instruction";

let registered = false;

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
      const suggestions = INSTRUCTION_STRINGS.filter((label) =>
        label.startsWith(text),
      ).map((label) => ({
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

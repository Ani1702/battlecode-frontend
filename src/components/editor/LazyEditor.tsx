"use client";

/**
 * LazyEditor
 *
 * Thin wrapper around `@monaco-editor/react`'s <Editor> that defers loading the
 * Monaco bundle until the component is actually rendered on the client
 * (`ssr: false`). Monaco is one of the heaviest dependencies in the app and is
 * only needed on code / hacking screens, so pulling it in on demand keeps the
 * initial JS payload for every other route small.
 *
 * Drop-in replacement: `import Editor from "@/components/editor/LazyEditor"`
 * accepts the exact same props as the original default import.
 */
import dynamic from "next/dynamic";
import type { EditorProps } from "@monaco-editor/react";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#1e1e1e] text-sm text-gray-400">
        Loading editor…
      </div>
    ),
  },
);

export default function LazyEditor(props: EditorProps) {
  return <MonacoEditor {...props} />;
}

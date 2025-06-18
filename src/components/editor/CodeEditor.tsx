"use client";
import { useState, useEffect } from "react";

type CodeEditorProps = {
  code: string;
  onChange: (code: string) => void;
  language?: string;
};

export default function CodeEditor({
  code,
  onChange,
  language = "javascript",
}: CodeEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 h-64">
        <p className="text-white">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-700 px-4 py-2 text-white text-sm">
        {language.toUpperCase()}
      </div>
      <textarea
        value={code}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-64 p-4 font-mono text-white bg-gray-800 outline-none resize-none"
        spellCheck="false"
      />
    </div>
  );
}

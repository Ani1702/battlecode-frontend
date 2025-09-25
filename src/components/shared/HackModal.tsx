"use client";
import { useState, useMemo, useEffect } from "react";
import Editor, { useMonaco } from '@monaco-editor/react';
import { ChevronLeft, ChevronRight, X, Swords } from "lucide-react";
import CustomScrollbar from "@/components/shared/CustomScrollbar";

interface Submission {
  userId: string;
  code: string;
  language: string;
}

interface HackModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: Submission[];
  onSubmitHack: (testCase: string, targetSubmission: Submission) => void;
}

export default function HackModal({ isOpen, onClose, submissions, onSubmitHack }: HackModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [customTestCase, setCustomTestCase] = useState("");
  const monaco = useMonaco();

  const currentSubmission = useMemo(() => submissions?.[currentIndex], [submissions, currentIndex]);

  // Reset to the first submission when the modal is opened or submissions change
  useEffect(() => {
    setCurrentIndex(0);
  }, [isOpen, submissions]);

  // Define a read-only theme for the editor
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('readonly-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#1a1a1a', // Slightly different background for readonly
          'editor.foreground': '#d4d4d4',
        },
      });
    }
  }, [monaco]);
  
  if (!isOpen) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % submissions.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + submissions.length) % submissions.length);
  };

  const handleSubmit = () => {
    if (!customTestCase.trim() || !currentSubmission) {
      alert("Please provide a test case.");
      return;
    }
    onSubmitHack(customTestCase, currentSubmission);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full max-w-4xl h-[90vh] bg-gray-900 border-2 border-red-500 rounded-lg text-white oxanium">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-10">
          <X size={24} />
        </button>

        <div className="flex items-center justify-between p-4 border-b border-red-500/30">
          <h2 className="text-2xl font-bold flex items-center gap-3"><Swords className="text-red-400" /> Hacking Arena</h2>
          {submissions.length > 0 && (
            <div className="flex items-center gap-4">
              <button onClick={handlePrev} disabled={submissions.length <= 1} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-40"><ChevronLeft /></button>
              <span className="font-mono text-lg">Submission {currentIndex + 1} / {submissions.length}</span>
              <button onClick={handleNext} disabled={submissions.length <= 1} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-40"><ChevronRight /></button>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0">
          {submissions.length > 0 && currentSubmission ? (
            <>
              {/* Left Side: Code Viewer */}
              <div className="w-full lg:w-2/3 flex flex-col border border-gray-700 rounded-md">
                <div className="bg-gray-800 px-4 py-2 text-sm text-amber-400 rounded-t-md">
                  Language: {currentSubmission.language}
                </div>
                <div className="flex-1 rounded-b-md overflow-hidden">
                   <Editor
                      height="100%"
                      language={currentSubmission.language}
                      value={currentSubmission.code}
                      theme="readonly-dark"
                      options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14 }}
                    />
                </div>
              </div>

              {/* Right Side: Test Case Input */}
              <div className="w-full lg:w-1/3 flex flex-col gap-4">
                 <h3 className="text-xl font-semibold">Add Custom Test Case</h3>
                 <p className="text-sm text-gray-400">Provide an input test case that you believe will cause this solution to fail.</p>
                 <textarea
                    value={customTestCase}
                    onChange={(e) => setCustomTestCase(e.target.value)}
                    placeholder="Enter your test case input here..."
                    className="w-full flex-1 p-3 bg-black border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm resize-none"
                 />
              </div>
            </>
          ) : (
             <div className="w-full flex items-center justify-center text-gray-400">
                <p>No other submissions are available to hack for this problem.</p>
             </div>
          )}
        </div>

        <div className="p-4 border-t border-red-500/30">
          <button
            onClick={handleSubmit}
            disabled={!customTestCase.trim() || submissions.length === 0}
            className="w-full py-3 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Swords size={20} /> Submit Hack Attempt
          </button>
        </div>
      </div>
    </div>
  );
}
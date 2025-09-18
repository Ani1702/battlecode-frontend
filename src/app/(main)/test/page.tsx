"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { 
  Lightbulb, 
  RotateCcw, 
  Save, 
  AlertTriangle, 
  CheckCircle, 
  Play,
} from "lucide-react";
import Editor, { useMonaco } from '@monaco-editor/react';
import CustomScrollbar from "@/components/shared/CustomScrollbar";
import { showSuccessToast, showErrorToast, showInfoToast } from "@/components/shared/CustomToast";

// Type definitions
interface SubmissionResult {
  token: string;
  status: {
    id: number;
    description: string;
  };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: string | null;
}

interface TestCase {
  input: {
    stdin?: string;
    json?: unknown;
  };
  output: {
    stdout?: string;
    json?: unknown;
  };
  explanation?: string;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  constraints: string[];
  hints: string[];
  boilerplate: Record<string, string>;
  sampleTestCases: TestCase[];
}

// Sample problem data
const sampleProblem: Problem = {
  id: "two-sum",
  title: "BATTLECODE",
  description: `Fast paced problem solving, head-to-head battles, race against the clock, test both your logic and strategy, New tests in every round.
`,
  difficulty: "Easy",
  constraints: [
    "Bring Your Laptop to the competition",
    "Raw skill, No AI",
    "Code in C, C++, Java, or Python",
  ],
  hints: [
    "A really brute force way would be to search for all possible pairs of numbers but that would be too slow. Again, it's best to try out brute force solutions for just for completeness. It is from these brute force solutions that you can come up with optimizations.",
    "So, if we fix one of the numbers, say x, we have to scan the entire array to find the next number y which is value - x where value is the input parameter. Can we change our array somehow so that this search becomes faster?",
    "The second train of thought is, without changing the array, can we use additional space somehow? Like maybe a hash map to speed up the search?"
  ],
  boilerplate: {
    python: `def Level_Up(Players):
    """
    :type Players: List[Player]
    """
    # Your code here
    pass`,
    java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[]{};
    }
}`,
    cpp: `#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your code here
        return {};
    }
};`,
    javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Your code here
};`
  },
  sampleTestCases: [
    {
      input: { stdin: "Players = ['You', 'Vibe Coder, 'Expert']" },
      output: { stdout: "'You'" },
      explanation: "Because we match based on skill."
    },
    {
      input: { stdin: "When in the Event?" },
      output: { stdout: "query = '28th September, 10AM - 6PM'" },
      explanation: "SJT-107 Smart Classroom"
    }
  ]
};

export default function CodePage() {
  // UI State
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<SubmissionResult[] | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [saveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // UI State
  const [codeEditorHeight, setCodeEditorHeight] = useState(60);
  const [isDragging, setIsDragging] = useState(false);

  // Mock timer
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize with boilerplate code
  useEffect(() => {
    setCode(sampleProblem.boilerplate[language] || sampleProblem.boilerplate.python || '');
  }, [language]);

  // Reset code to boilerplate
  const resetCodeToBoilerplate = () => {
    const boilerplate = sampleProblem.boilerplate[language] || sampleProblem.boilerplate.python || '';
    setCode(boilerplate);
    showInfoToast('Code reset to boilerplate');
  };

  // Get save status display
  const getSaveStatusDisplay = () => {
    switch (saveStatus) {
      case 'saving':
        return { text: 'Saving...', className: 'text-yellow-400', icon: <Save className="h-3 w-3" /> };
      case 'saved':
        return { text: 'Saved', className: 'text-green-400', icon: <CheckCircle className="h-3 w-3" /> };
      case 'error':
        return { text: 'Save Error', className: 'text-red-400', icon: <AlertTriangle className="h-3 w-3" /> };
      default:
        return { text: '', className: '', icon: null };
    }
  };

  // Monaco Editor Setup
  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on' as const,
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on' as const,
    bracketPairColorization: { enabled: true },
    autoIndent: 'full' as const,
    formatOnPaste: true,
    formatOnType: true,
  };

  const getMonacoLanguage = (lang: string) => {
    const languageMap: { [key: string]: string } = {
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'javascript': 'javascript',
    };
    return languageMap[lang] || 'python';
  };

  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('custom-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '#6A9955' },
          { token: 'keyword', foreground: '#569CD6' },
          { token: 'string', foreground: '#CE9178' },
          { token: 'number', foreground: '#B5CEA8' },
        ],
        colors: {
          'editor.background': '#0a0a0a',
          'editor.foreground': '#ffffff',
          'editor.lineHighlightBackground': '#1a1a1a',
          'editor.selectionBackground': '#264f78',
          'editor.inactiveSelectionBackground': '#3a3d41',
          'editorCursor.foreground': '#f97316',
          'editorLineNumber.foreground': '#858585',
          'editorLineNumber.activeForeground': '#f97316',
          'editor.selectionHighlightBackground': '#ADD6FF26',
          'editor.wordHighlightBackground': '#575757B8',
          'editorBracketMatch.background': '#0064001a',
          'editorBracketMatch.border': '#888888',
        },
      });
      monaco.editor.setTheme('custom-dark');
    }
  }, [monaco]);

  // Mock Code Execution - Always returns 2 passed test cases
  const executeCode = async (isSubmission = false) => {
    const action = isSubmission ? 'submitting' : 'running';
    showInfoToast(`${action.charAt(0).toUpperCase() + action.slice(1)} your code...`);

    if (isSubmission) {
      setIsSubmitting(true);
    } else {
      setIsRunning(true);
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Mock successful results - always 2 passed test cases
      const mockResults: SubmissionResult[] = [
        {
          token: "test_1",
          status: { id: 3, description: "Accepted" },
          stdout: "[0,1]",
          stderr: null,
          compile_output: null,
          time: "0.001",
          memory: "256"
        },
        {
          token: "test_2", 
          status: { id: 3, description: "Accepted" },
          stdout: "[1,2]",
          stderr: null,
          compile_output: null,
          time: "0.002",
          memory: "256"
        }
      ];

      setSubmissionResults(mockResults);

      if (isSubmission) {
        showSuccessToast(`All 2 test cases passed! Submission saved.`);
      } else {
        showSuccessToast(`All 2 sample test cases passed!`);
      }

    } catch (error) {
      console.error('Execution error:', error);
      showErrorToast(`Failed to ${action} code`);
    } finally {
      if (isSubmission) {
        setIsSubmitting(false);
      } else {
        setIsRunning(false);
      }
    }
  };

  // Resizable Splitter
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const container = document.querySelector('.code-results-container') as HTMLElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const containerHeight = rect.height;
    const mouseY = e.clientY - rect.top;
    const newHeightPercentage = Math.max(20, Math.min(80, (mouseY / containerHeight) * 100));

    setCodeEditorHeight(newHeightPercentage);
  }, [isDragging]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove]);

  // Utility Functions
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerDisplay = (): { time: string; className: string } => {
    const isWarning = timeRemaining <= 300; // 5 minutes
    const isCritical = timeRemaining <= 60;  // 1 minute

    return {
      time: formatTime(timeRemaining),
      className: isCritical ? ' text-red-400' :
        isWarning ? ' text-yellow-400' : 'border-amber-600'
    };
  };

  const formatTestCaseData = (data: unknown): string => {
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return data.join(', ');
    if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data);
      return entries.map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key} = [${value.join(', ')}]`;
        }
        return `${key} = ${value}`;
      }).join('\n');
    }
    return String(data);
  };

  const saveStatusDisplay = getSaveStatusDisplay();

  // Render
  return (
    <div className="flex flex-col h-screen text-white overflow-hidden bg-[url('/bg-code.svg')] bg-fixed bg-cover bg-center oxanium">
      {/* Main Content */}
      <div className="flex-1 flex p-4 gap-4 bg-black/40 min-h-0">
        {/* Question Panel */}
        <CustomScrollbar className="w-1/2 flex border rounded-lg border-amber-600 bg-black/40 p-4 flex-col min-h-0 overflow-hidden glass-box">
          <div className="flex justify-between items-start mb-4 flex-shrink-0">
            <div>
              <h2 className="text-2xl font-bold">{sampleProblem.title}</h2>
              <div className="flex gap-4 text-sm text-gray-400 mt-1">
                <span>Difficulty: {sampleProblem.difficulty}</span>
                <span>Round: Test</span>
                <span>Question: 1/1</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHints(!showHints)}
                className="rounded-lg border p-4 h-12 text-white border-amber-600 font-oxanium w-30 justify-center items-center flex bg-black/20 backdrop-blur-sm hover:bg-amber-600 hover:text-black transition-colors duration-300 shadow-[0_0_20px_rgba(220,38,38,0.3)] gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                {showHints ? "Hide" : "Hint"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {showHints && sampleProblem.hints && sampleProblem.hints.length > 0 && (
              <div className="mb-4 bg-black p-3 rounded">
                <h3 className="font-bold mb-2 text-amber-400">Hints:</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  {sampleProblem.hints.map((hint, i) => <li key={i}>{hint}</li>)}
                </ul>
              </div>
            )}

            <p className="mb-4 text-gray-300 whitespace-pre-wrap">{sampleProblem.description}</p>

            {sampleProblem.constraints && sampleProblem.constraints.length > 0 && (
              <>
                <h3 className="font-bold mb-2 text-amber-400">Constraints:</h3>
                <ul className="list-disc list-inside mb-4 text-gray-300 font-mono text-sm">
                  {sampleProblem.constraints.map((constraint, i) => (
                    <li key={i}>{constraint}</li>
                  ))}
                </ul>
              </>
            )}

            {sampleProblem.sampleTestCases && sampleProblem.sampleTestCases.length > 0 && (
              <>
                <h3 className="font-bold mb-4 text-amber-400">Sample Cases:</h3>
                {sampleProblem.sampleTestCases.map((testCase, i) => (
                  <div key={i} className="mb-4 bg-black/20 border-amber-600/50 mr-2 border-2 p-3 rounded font-mono text-sm">
                    <p className="font-bold text-gray-400">Input:</p>
                    <pre className="bg-gray-800/60 p-2 rounded mt-1 whitespace-pre-wrap">
                      {formatTestCaseData(testCase.input?.stdin || testCase.input?.json || '')}
                    </pre>
                    <p className="mt-2 font-bold text-gray-400">Output:</p>
                    <pre className="bg-gray-800/60 p-2 rounded mt-1 whitespace-pre-wrap">
                      {formatTestCaseData(testCase.output?.stdout || testCase.output?.json || '')}
                    </pre>
                    {testCase.explanation && (
                      <p className="mt-2 text-xs text-gray-400 italic">
                        Explanation: {testCase.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </CustomScrollbar>

        {/* Code & Results Panel */}
        <div className="w-1/2 flex flex-col code-results-container border-amber-500" style={{ height: '100%' }}>
          {/* Code Editor */}
          <div className="border border-amber-600 rounded-lg p-4 flex flex-col min-h-0" style={{ height: `${codeEditorHeight}%`, minHeight: '200px' }}>
            <div className="flex justify-between items-center mb-2 gap-2">
              <div className="flex-1 flex gap-2 px-4">
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)} 
                  className="bg-black flex-[0.3] text-white rounded border w-20 px-4 border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none bg-no-repeat bg-right "
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23f59e0b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
               
                </select>
                <div className={`bg-black flex-[0.2] text-white p-2 rounded border border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center font-mono ${getTimerDisplay().className
                  }`}>
                  {getTimerDisplay().time}
                  {saveStatusDisplay.text && (
                    <span className={`ml-2 text-xs ${saveStatusDisplay.className} flex items-center gap-1`}>
                      {saveStatusDisplay.icon}
                      {saveStatusDisplay.text}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex items-center bg-black text-white p-2 rounded border border-amber-600 hover:bg-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                  onClick={() => executeCode(false)}
                  disabled={isRunning || isSubmitting}
                >
                  
                  <span className = "pl-2">Run</span>
                  <Play className="ml-2 h-4 w-4"/>
                </button>
                <button 
                  className="flex items-center gap-2  bg-black text-white p-2 rounded border border-amber-600 hover:bg-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                  onClick={() => executeCode(true)}
                  disabled={isSubmitting || isRunning}
                >
                  {/* <Send className="ml-2 h-4 w-4"/> */}
                  
                  <p className = "pl-2">{isSubmitting ? "Submitting..." : "Submit"}</p>
                  <Image src="/submit_2.png" alt="submit" width={16} height={16} className="mr-2"/>
                </button>
                <button
                  className="flex items-center gap-2 bg-black text-white p-2 rounded border border-amber-600  focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onClick={resetCodeToBoilerplate}
                  title="Reset to boilerplate code"
                >
                  <RotateCcw className="h-4 w-4"/>
                </button>
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 rounded overflow-hidden border border-gray-700">
              <Editor
                height="100%"
                language={getMonacoLanguage(language)}
                value={code}
                onChange={(value) => setCode(value || "")}
                theme="custom-dark"
                options={editorOptions}
                loading={
                  <div className="flex items-center justify-center h-full bg-black">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                  </div>
                }
              />
            </div>
          </div>

          {/* Resizable Divider */}
          <div
            className={`h-1 bg-amber-600/20 hover:bg-amber-600/40 cursor-row-resize transition-colors duration-200 flex items-center justify-center ${isDragging ? 'bg-amber-600/60' : ''
              }`}
            onMouseDown={handleMouseDown}
          >
            <div className="w-8 h-1 bg-amber-600 rounded-full"></div>
          </div>

          {/* Test Results & Actions */}
          <div
            className="border border-amber-600 rounded-lg p-4 flex flex-col min-h-0"
            style={{ height: `${100 - codeEditorHeight}%`, minHeight: '150px' }}
          >
            <span className="text-lg font-bold flex-shrink-0">Test Results</span>
            <div className="mt-2 flex-grow overflow-y-auto">
              {(isSubmitting || isRunning) && (
                <div className="flex items-center gap-2 text-amber-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
                  <span>{isSubmitting ? 'Submitting' : 'Running'} your solution...</span>
                </div>
              )}
              {submissionResults && (
                <div className="space-y-2">
                  {submissionResults.map((result, index) => {
                    const isAccepted = result.status.description === "Accepted";
                    const isError = result.status.id > 3;
                    return (
                      <div key={result.token || index} className={`p-2 rounded ${isAccepted ? "bg-green-800/50" : isError ? "bg-red-800/50" : "bg-yellow-800/50"}`}>
                        <p className="font-bold">
                          Test Case {index + 1}:{" "}
                          <span className={`${isAccepted ? "text-green-400" : isError ? "text-red-400" : "text-yellow-400"}`}>
                            {result.status.description}
                          </span>
                        </p>
                        {!isAccepted && (result.stderr || result.compile_output) && (
                          <pre className="text-xs text-red-300 mt-1 whitespace-pre-wrap bg-black/30 p-1 rounded">
                            {result.stderr || result.compile_output}
                          </pre>
                        )}
                        {result.time && (
                          <p className="text-xs text-gray-400 mt-1">
                            Time: {result.time}s | Memory: {result.memory}KB
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

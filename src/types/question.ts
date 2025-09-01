export interface TestCase {
  input: {
    stdin?: string;
    json?: any;
  };
  output: {
    stdout?: string;
    json?: any;
  };
  explanation?: string;
}

export interface QuestionMetadata {
  createdAt: string;
  updatedAt: string;
  author: string;
  solved: number;
  attempted: number;
  tags: string[];
  averageRating: number;
  totalRatings: number;
}

export interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  constraints: string[];
  hints: string[];
  boilerplate: Record<string, string>;
  sampleTestCases: TestCase[];
  hiddenTestCases: TestCase[];
  categories: string[];
  avgTimeComplexity: string;
  avgSpaceComplexity: string;
  timeLimit: number; // Time limit in seconds
  points: number; // Points for solving the question
  metadata: QuestionMetadata;
}

export interface QuestionSession {
  questionId: string;
  startTime: Date;
  endTime?: Date;
  timeRemaining: number;
  attempts: number;
  status: 'active' | 'completed' | 'timeout' | 'abandoned';
  score?: number;
  submissionHistory: Submission[];
}

export interface Submission {
  id: string;
  timestamp: Date;
  code: string;
  language: string;
  status: SubmissionStatus;
  testResults: TestResult[];
  executionTime?: number;
  memoryUsage?: number;
}

export interface SubmissionStatus {
  id: number;
  description: string;
}

export interface TestResult {
  testCaseIndex: number;
  passed: boolean;
  actualOutput?: string;
  expectedOutput: string;
  errorMessage?: string;
  executionTime?: number;
  memoryUsage?: number;
}

// Utility functions for question management
export class QuestionManager {
  static createQuestionSession(question: Question): QuestionSession {
    return {
      questionId: question.id,
      startTime: new Date(),
      timeRemaining: question.timeLimit,
      attempts: 0,
      status: 'active',
      submissionHistory: []
    };
  }

  static calculateTimeElapsed(session: QuestionSession): number {
    const now = new Date();
    return Math.floor((now.getTime() - session.startTime.getTime()) / 1000);
  }

  static calculateTimeRemaining(session: QuestionSession, question: Question): number {
    const elapsed = this.calculateTimeElapsed(session);
    return Math.max(0, question.timeLimit - elapsed);
  }

  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  static getDifficultyColor(difficulty: Question['difficulty']): string {
    switch (difficulty) {
      case 'Easy': return 'bg-green-800 text-green-300';
      case 'Medium': return 'bg-yellow-800 text-yellow-300';
      case 'Hard': return 'bg-red-800 text-red-300';
      default: return 'bg-gray-800 text-gray-300';
    }
  }

  static calculateSuccessRate(solved: number, attempted: number): number {
    return attempted > 0 ? Math.round((solved / attempted) * 100) : 0;
  }

  static isTimeWarning(timeLeft: number, totalTime: number): boolean {
    return timeLeft <= Math.min(300, totalTime * 0.1); // Last 5 minutes or 10% of total time
  }

  static isTimeCritical(timeLeft: number, totalTime: number): boolean {
    return timeLeft <= Math.min(60, totalTime * 0.05); // Last 1 minute or 5% of total time
  }
}

// Sample question data
export const sampleQuestions: Question[] = [
  {
    id: "q001",
    title: "Two Sum",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    difficulty: "Easy",
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "-10⁹ ≤ nums[i] ≤ 10⁹",
      "-10⁹ ≤ target ≤ 10⁹",
      "Only one valid answer exists"
    ],
    hints: [
      "A brute force approach would be to check every pair of numbers.",
      "Try using a hash map to store values you've seen before.",
      "For each number, check if target - number exists in your hash map."
    ],
    boilerplate: {
      javascript: "function twoSum(nums, target) {\n    // Your code here\n}",
      python: "def two_sum(nums, target):\n    # Your code here\n    pass",
      java: "public int[] twoSum(int[] nums, int target) {\n    // Your code here\n}",
      cpp: "vector<int> twoSum(vector<int>& nums, int target) {\n    // Your code here\n}",
      c: "#include <stdio.h>\n#include <stdlib.h>"
    },
    sampleTestCases: [
      {
        input: { json: { nums: [2, 7, 11, 15], target: 9 } },
        output: { json: [0, 1] },
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: { json: { nums: [3, 2, 4], target: 6 } },
        output: { json: [1, 2] },
        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
      }
    ],
    hiddenTestCases: [
      {
        input: { json: { nums: [3, 3], target: 6 } },
        output: { json: [0, 1] }
      }
    ],
    categories: ["Array", "Hash Table"],
    avgTimeComplexity: "O(n)",
    avgSpaceComplexity: "O(n)",
    timeLimit: 1800, // 30 minutes
    points: 150,
    metadata: {
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T12:00:00Z",
      author: "LeetCode",
      solved: 2500000,
      attempted: 3200000,
      tags: ["fundamental", "hash-table", "beginner-friendly"],
      averageRating: 4.2,
      totalRatings: 12000
    }
  }
];

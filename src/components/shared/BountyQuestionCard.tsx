"use client";
import React, { useState } from 'react';
import { CheckCircle, ShieldCheck } from 'lucide-react';

// The interface is updated to include the new states from the backend.
export interface BountyQuestion {
  id: string;
  name: string;
  difficulty: string;
  description: string;
  isSolved: boolean; // True if THIS user has solved it correctly.
  isSolvedByAnyone?: boolean; // True if ANY user has claimed the bounty.
  isAttemptedByUser?: boolean; // True if THIS user has already attempted it.
}

interface BountyQuestionCardProps {
  question: BountyQuestion;
  onSolve: (questionId: string) => void;
  questionIndex: number;
}

export default function BountyQuestionCard({ question, onSolve, questionIndex }: BountyQuestionCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Determine the card's state based on the new props ---
  const isBountyClaimed = question.isSolvedByAnyone;
  const hasUserAttempted = question.isAttemptedByUser;
  const hasUserSolved = question.isSolved;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'R2_BOUNTY': return 'text-purple-600'; // Example for bounty difficulty
      default: return 'text-gray-600';
    }
  };

  const getDifficultyBg = (difficulty: string) => {
    switch (difficulty) {
      case 'R2_BOUNTY': return 'bg-purple-100 border-purple-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  // --- Updated logic for the small card's status text ---
  // const getCardStatus = () => {
  //   if (hasUserSolved) return { text: '✓ SOLVED', className: 'text-green-300' };
  //   if (hasUserAttempted) return { text: 'ATTEMPTED', className: 'text-yellow-300' };
  //   if (isBountyClaimed) return { text: 'CLAIMED', className: 'text-white/80' };
  //   return { text: 'AVAILABLE', className: 'text-white/80' };
  // };

  // const cardStatus = getCardStatus(); // Removed unused variable

  // --- Updated logic for the main action button in the modal ---
  const getButtonState = () => {
    if (hasUserSolved) return { text: 'Already Solved', disabled: true };
    if (hasUserAttempted) return { text: 'Already Attempted', disabled: true };
    return { text: 'Start Bounty', disabled: false };
  };

  const buttonState = getButtonState();

  return (
    <>
      {/* Small Card */}
      <div
        className={`w-32 h-20 rounded-lg shadow-lg mt-2 ml-2 p-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${isBountyClaimed ? 'bg-cyan-700' : 'bg-orange-700' // Color reflects if bounty is claimed
          } border-2 border-white/30 mb-2 mr-2 flex justify-center items-center transform hover:z-10 relative`}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="text-white text-4xl font-bold font-orbitron">
          {questionIndex + 1}
        </div>
      </div>

      {/* Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
          <div
            className="bg-gray-800 border-2 border-cyan-500/50 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-white font-bold text-xl font-orbitron flex-1">{question.name}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4 oxanium">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyBg(question.difficulty)} ${getDifficultyColor(question.difficulty)}`}>
                  {question.difficulty.replace('R2_', '')}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${hasUserSolved ? 'bg-green-100 text-green-600 border-green-300' : 'bg-red-100 text-red-600 border-red-300'
                  }`}>
                  <CheckCircle className={`w-4 h-4 ${hasUserSolved ? 'text-green-600' : 'text-red-600'}`} />
                  {hasUserSolved ? 'You Solved' : 'You Haven\'t Solved'}
                </span>
                {isBountyClaimed && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border bg-cyan-100 text-cyan-600 border-cyan-300">
                    <ShieldCheck className="w-4 h-4" />
                    Bounty Claimed
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-cyan-300 font-semibold mb-2">Description:</h4>
                <p className="text-gray-300 text-sm leading-relaxed bg-black/20 rounded-lg p-3 oxanium max-h-40 overflow-y-auto">
                  {question.description}
                </p>
              </div>

              <div className="mt-6">
                <button
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors duration-200 text-white ${buttonState.disabled
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  disabled={buttonState.disabled}
                  onClick={() => {
                    if (!buttonState.disabled) {
                      onSolve(question.id);
                      setIsModalOpen(false);
                    }
                  }}
                >
                  {buttonState.text}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
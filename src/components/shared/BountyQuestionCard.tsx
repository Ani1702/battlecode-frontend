import React, { useState } from 'react';

// This is the single source of truth for the BountyQuestion type
export interface BountyQuestion {
  id: string;
  name: string; // Mapped from 'title'
  difficulty: string;
  description: string;
  isSolved: boolean; // User-specific status
}

interface BountyQuestionCardProps {
  question: BountyQuestion;
  onSolve: (questionId: string) => void;
}

export default function BountyQuestionCard({ question, onSolve }: BountyQuestionCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'Hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDifficultyBg = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 border-green-300';
      case 'Medium': return 'bg-yellow-100 border-yellow-300';
      case 'Hard': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <>
      {/* Small Card */}
      <div 
        className={`w-auto h-16 rounded-lg shadow-lg mt-2 ml-2 p-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${
          question.isSolved ? 'bg-cyan-700' : 'bg-orange-500'
        } border-2 border-white/30 mb-2 mr-2 inline-flex flex-col justify-center items-center transform hover:z-10 relative`}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="text-white text-xs font-bold font-orbitron truncate max-w-[80px]">{question.name}</div>
        <div className={`text-xs ${question.isSolved ? 'text-green-300' : 'text-white/80'}`}>
          {question.isSolved ? '✓ SOLVED' : 'AVAILABLE'}
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

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyBg(question.difficulty)} ${getDifficultyColor(question.difficulty)}`}>
                  {question.difficulty}
                </span>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${
                  question.isSolved ? 'bg-green-100 text-green-600 border-green-300' : 'bg-red-100 text-red-600 border-red-300'
                }`}>
                  {question.isSolved ? 'Solved' : 'Unsolved'}
                </span>
              </div>
              
              <div>
                <h4 className="text-cyan-300 font-semibold mb-2">Description:</h4>
                <p className="text-gray-300 text-sm leading-relaxed bg-black/20 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {question.description}
                </p>
              </div>

              <div className="mt-6">
                <button 
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors duration-200 text-white ${
                    question.isSolved 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                  disabled={question.isSolved}
                  onClick={() => {
                    if (!question.isSolved) {
                      onSolve(question.id);
                      setIsModalOpen(false);
                    }
                  }}
                >
                  {question.isSolved ? 'Already Solved' : 'Start Bounty'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
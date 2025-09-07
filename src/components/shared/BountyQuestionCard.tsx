import React, { useState } from 'react';
import { BountyQuestion } from '../../types/types';

interface BountyQuestionCardProps {
  question: BountyQuestion;
}

export default function BountyQuestionCard({ question }: BountyQuestionCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-600';
      case 'Medium':
        return 'text-yellow-600';
      case 'Hard':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getDifficultyBg = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 border-green-300';
      case 'Medium':
        return 'bg-yellow-100 border-yellow-300';
      case 'Hard':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <>
      {/* Small Card */}
      <div 
        className={`w-24 h-16 rounded-lg shadow-lg mt-2 ml-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-110 ${
          question.isSolved 
            ? 'bg-gradient-to-br from-green-400 to-green-600' 
            : 'bg-gradient-to-br from-orange-400 to-orange-600'
        } border-2 border-white border-opacity-30 mb-2 mr-2 inline-block transform hover:z-10 relative`}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="w-full h-full flex flex-col items-center justify-center p-1">
          {question.isSolved ? (
            <div className="text-center">
              <div className="text-white text-xs font-bold font-orbitron">SOLVED</div>
              <div className="text-white text-opacity-80 text-xs">✓</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-white text-xs font-bold font-orbitron">BOUNTY</div>
              <div className="text-white text-opacity-80 text-xs">?</div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/55 bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsModalOpen(false)}>
          <div 
            className="bg-gradient-to-br from-orange-300 to-orange-600 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl transform transition-all duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-white font-bold text-xl font-orbitron flex-1">
                Question Details
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:text-gray-200 transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Question Name */}
              <div>
                <h3 className="text-white font-bold text-lg font-orbitron">
                  {question.name}
                </h3>
              </div>
              
              {/* Status and Difficulty */}
              <div className="flex items-center gap-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border-2 ${getDifficultyBg(question.difficulty)} ${getDifficultyColor(question.difficulty)}`}>
                  {question.difficulty}
                </span>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  question.isSolved 
                    ? 'bg-green-100 text-green-600 border-2 border-green-300' 
                    : 'bg-red-100 text-red-600 border-2 border-red-300'
                }`}>
                  {question.isSolved ? 'Solved' : 'Unsolved'}
                </span>
              </div>
              
              {/* Description */}
              <div>
                <h4 className="text-white font-semibold mb-2">Description:</h4>
                <p className="text-white text-opacity-90 text-sm leading-relaxed glass-box bg-opacity-10 rounded-lg p-3">
                  {question.description}
                </p>
              </div>
              
              {/* Points */}
              {question.points && (
                <div className="flex items-center">
                  <span className="text-white font-semibold">
                    Bounty Reward: {question.points} points
                  </span>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-6">
                <button 
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors duration-200 ${
                    question.isSolved
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                  onClick={() => {
                    // Add your navigation logic here
                    console.log(`${question.isSolved ? 'View Solution' : 'Start Challenge'} for question: ${question.id}`);
                    setIsModalOpen(false);
                  }}
                >
                  {question.isSolved ? 'View Solution' : 'Start Challenge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

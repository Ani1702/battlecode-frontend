"use client";
import { useState } from 'react';
import CustomScrollbar from './CustomScrollbar';
import IncomingChallengeCard from './IncomingChallengeCard';
import BountyQuestionCard from './BountyQuestionCard';
import { BountyQuestion } from '../../types/types';

interface Player {
  id: string;
  username: string;
  rank: number;
}

export default function EliteLobby() {
  // Mock data for incoming challengers - replace with actual data source
  const [incomingChallengers, setIncomingChallengers] = useState<Player[]>([
    { id: '1', username: 'CodeMaster2024', rank: 15 },
    { id: '2', username: 'AlgorithmNinja', rank: 8 },
    { id: '3', username: 'ByteWarrior', rank: 23 },
    { id: '4', username: 'DataStructureGod', rank: 5 },
    { id: '5', username: 'CompetitiveCoder', rank: 12 },
    { id: '6', username: 'LogicLegend', rank: 19 },
  ]);

  // Mock data for bounty questions - replace with actual data source
  const [bountyQuestions, setBountyQuestions] = useState<BountyQuestion[]>([
    {
      id: '1',
      name: 'Binary Tree Maximum Path Sum',
      difficulty: 'Hard',
      description: 'Given a non-empty binary tree, find the maximum path sum. A path is defined as any sequence of nodes from some starting node to any node in the tree along the parent-child connections.',
      isSolved: true,
      points: 500
    },
    {
      id: '2',
      name: 'Longest Palindromic Substring',
      difficulty: 'Medium',
      description: 'Given a string s, return the longest palindromic substring in s. A palindrome reads the same backward as forward.',
      isSolved: false,
      points: 300
    },
    {
      id: '3',
      name: 'Merge K Sorted Lists',
      difficulty: 'Hard',
      description: 'You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list.',
      isSolved: false,
      points: 450
    },
    {
      id: '4',
      name: 'Two Sum',
      difficulty: 'Easy',
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      isSolved: true,
      points: 100
    },
    {
      id: '5',
      name: 'Valid Parentheses',
      difficulty: 'Easy',
      description: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.',
      isSolved: true,
      points: 150
    },
    {
      id: '6',
      name: 'Sliding Window Maximum',
      difficulty: 'Hard',
      description: 'You are given an array of integers nums, there is a sliding window of size k which is moving from the very left of the array to the very right.',
      isSolved: false,
      points: 400
    },
    {
      id: '7',
      name: 'Best Time to Buy and Sell Stock',
      difficulty: 'Easy',
      description: 'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock.',
      isSolved: false,
      points: 120
    }
  ]);

  const handleAcceptChallenge = (playerId: string) => {
    console.log(`Accepted challenge from player: ${playerId}`);
    // Remove player from incoming challengers after accepting
    setIncomingChallengers(prev => prev.filter(player => player.id !== playerId));
    // Add your accept challenge logic here
  };

  const handleDenyChallenge = (playerId: string) => {
    console.log(`Denied challenge from player: ${playerId}`);
    // Remove player from incoming challengers after denying
    setIncomingChallengers(prev => prev.filter(player => player.id !== playerId));
    // Add your deny challenge logic here
  };

  return (
    <>
      <div className="flex bg-[url('/elite-bg.svg')] bg-cover h-screen flex-col overflow-hidden orbitron">
        <div className="flex-1 flex items-center justify-center text-6xl orbitron">ELITE DASHBOARD</div>
        <div className="flex-4 flex flex-row">
          <div className="flex-1">
            <div className="h-[80%] w-[80%] glass-box rounded-lg m-auto mt-10 p-5">
              <h2 className="text-2xl font-bold text-white mb-4 font-orbitron">
                Incoming Challengers
              </h2>
              
              <CustomScrollbar className="h-[calc(100%-3rem)] overflow-y-auto pr-2">
                {incomingChallengers.length > 0 ? (
                  incomingChallengers.map((player) => (
                    <IncomingChallengeCard
                      key={player.id}
                      player={player}
                      onAccept={handleAcceptChallenge}
                      onDeny={handleDenyChallenge}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="text-lg">No incoming challenges</p>
                    <p className="text-sm">Challenge other players to get started!</p>
                  </div>
                )}
              </CustomScrollbar>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="h-[80%] w-[80%] glass-box rounded-lg m-auto mt-10 p-5">
              <h2 className="text-2xl font-bold text-white mb-4 font-orbitron">
                Bounty Questions
              </h2>
              
              <CustomScrollbar className="h-[calc(100%-3rem)] overflow-y-auto pr-2 ">
                {bountyQuestions.length > 0 ? (
                  bountyQuestions.map((question) => (
                    <BountyQuestionCard
                      key={question.id}
                      question={question}
                    />
                  ))
                ) : (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="text-lg">No bounty questions available</p>
                    <p className="text-sm">Check back later for new challenges!</p>
                  </div>
                )}
              </CustomScrollbar>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
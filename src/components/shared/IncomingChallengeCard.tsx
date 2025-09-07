
import React from 'react';

interface Player {
  id: string;
  username: string;
  rank: number;
}

interface IncomingChallengeCardProps {
  player: Player;
  onAccept: (playerId: string) => void;
  onDeny: (playerId: string) => void;
}

export default function IncomingChallengeCard({ 
  player, 
  onAccept, 
  onDeny 
}: IncomingChallengeCardProps) {
  return (
    <div className="bg-gradient-to-r from-orange-600 to-orange-300 rounded-lg p-4 mb-3 shadow-md">
      <div className="flex items-center justify-between">
        {/* Player Info */}
        <div className="flex-1">
          <h3 className="text-white font-semibold text-lg font-orbitron">
            {player.username}
          </h3>
          <p className="text-orange-100 text-sm">
            Rank: #{player.rank}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onAccept(player.id)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
          >
            Accept
          </button>
          <button
            onClick={() => onDeny(player.id)}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}

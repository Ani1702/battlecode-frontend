import React from "react";

interface Player {
  id: string;
  username: string;
  rank: number;
}

interface EliteCardProps {
  player: Player;
  onChallenge: (playerId: string) => void;
}

export default function EliteCard({ player, onChallenge }: EliteCardProps) {
  return (
    <div className="rounded-lg p-4 mb-3 shadow-md bg-orange-500">
      <div className="flex items-center justify-between">
        {/* Player Info */}
        <div className="flex-1">
          <h3 className="text-white font-semibold text-lg font-orbitron">
            {player.username}
          </h3>
          <p className="text-orange-100 text-sm">Rank: #{player.rank}</p>
        </div>

        {/* Challenge Button */}
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onChallenge(player.id)}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
          >
            Challenge
          </button>
        </div>
      </div>
    </div>
  );
}

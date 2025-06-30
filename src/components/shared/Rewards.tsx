import React from 'react';

interface Badge {
  id: number;
  name: string;
  imageUrl: string;
}

interface RewardsProps {
  badges: Badge[];
}

const Rewards: React.FC<RewardsProps> = ({ badges }) => {
  // Always show 4 slots, fill with null for empty slots
  const slots = Array(4).fill(null).map((_, i) => badges[i] || null);
  return (
    <div className="w-full p-4">
      <h3 className="text-lg font-oxanium text-gray-300 mb-8 uppercase tracking-wider">Rewards</h3>
      <div className="flex justify-around items-start">
        {slots.map((badge, idx) => (
          <div key={badge ? badge.id : `empty-${idx}`} className="flex flex-col items-center text-center w-48">
            <div className="h-40 w-auto flex items-center justify-center mb-4">
              {badge ? (
                <img src={badge.imageUrl} alt={badge.name} className="max-h-full" />
              ) : null}
            </div>
            <p className="text-base font-sans uppercase tracking-widest text-gray-400">
              {badge ? badge.name : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Rewards;

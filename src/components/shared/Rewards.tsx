import React, { useState, useEffect } from 'react';

interface Badge {
  id: number;
  name: string;
  imageUrl: string;
  onClick?: () => void;
}

interface RewardsProps {
  badges: Badge[];
  onBadgeClick?: (badge: Badge) => void;
}

const Rewards: React.FC<RewardsProps> = ({ badges, onBadgeClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Auto-scroll carousel every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex >= badges.length - 4 ? 0 : prevIndex + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [badges.length]);

  const handleBadgeClick = (badge: Badge) => {
    console.log('Badge clicked:', badge.name);
    if (onBadgeClick) {
      onBadgeClick(badge);
    } else if (badge.onClick) {
      badge.onClick();
    }
  };

  const handleButtonClick = (e: React.MouseEvent, badge: Badge) => {
    e.preventDefault();
    e.stopPropagation();
    handleBadgeClick(badge);
  };
  
  return (
    <div className="w-full p-4 relative z-10">
      <h3 className="text-lg font-oxanium text-gray-300 mb-8 uppercase tracking-wider">Rewards</h3>
      
      <div className="relative flex items-center">
        {/* Badges Container */}
        <div className="overflow-hidden w-full px-12 relative">
          <div 
            className="flex transition-transform duration-500 ease-in-out relative z-10"
            style={{
              transform: `translateX(-${(currentIndex * 25)}%)`,
              width: `${badges.length * 25}%`
            }}
          >
            {badges.map((badge, idx) => (
              <button
                key={`badge-${badge.id}-${idx}`} 
                className="flex flex-col items-center text-center flex-shrink-0 w-1/4 relative focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 rounded-lg p-2 transition-all duration-200 hover:bg-white/5"
                onClick={(e) => handleButtonClick(e, badge)}
                type="button"
              >
                <div className="h-40 w-auto flex items-center justify-center mb-4 relative z-10 pointer-events-none">
                  <img 
                    src={badge.imageUrl} 
                    alt={badge.name} 
                    className="max-h-full transition-transform duration-200 hover:scale-105" 
                    draggable={false}
                  />
                </div>
                <p className="text-base font-sans uppercase tracking-widest text-gray-400 relative z-10 pointer-events-none">
                  {badge.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rewards;

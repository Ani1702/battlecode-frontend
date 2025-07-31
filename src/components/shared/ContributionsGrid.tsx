import React from 'react';

interface ContributionsGridProps {
  data: number[];
}

const getColorForLevel = (level: number): string => {
  if (level === 0) return 'bg-black/60'; // Lighter gray for inactive blocks
  if (level === 1) return 'bg-red-500/60';
  if (level >= 2 && level <= 4) return 'bg-red-600/60';
  if (level > 4) return 'bg-red-700/60';
  return 'bg-black/60';
};

const ContributionsGrid: React.FC<ContributionsGridProps> = ({ data }) => {
  return (
    <div className="w-full h-90 p-4 flex flex-col ">
      <h3 className="text-lg font-oxanium text-gray-200 mb-4 flex-shrink-0" style={{ textShadow: '0 0 8px rgba(255, 255, 255, 0.6)' }}>CONTRIBUTIONS</h3>
      <div className = "h-5 w-full"></div>
      <div className="grid grid-flow-col grid-rows-7 gap-1.5 w-full flex-grow ">
        {data.map((level, index) => (
          <div
            key={index}
            className={`w-full h-full rounded-sm ${getColorForLevel(level)}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ContributionsGrid;

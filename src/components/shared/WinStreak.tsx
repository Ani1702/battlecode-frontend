import React from 'react';

interface WinStreakProps {
  days: number;
}

const WinStreak: React.FC<WinStreakProps> = ({ days }) => {
  return (
    <div className="flex-1 h-full rounded-2xl bg-black/40 backdrop-blur-sm p-6 flex flex-col items-center justify-around border border-red-500/30 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
      <h3 className="text-3xl font-oxanium text-gray-200 tracking-widest">WINNING STREAK</h3>
      <div className="text-7xl my-2">
        <img src="./fire.svg" className="h-fit w-fit" alt="fire" />
      </div>
      <p className="text-lg text-gray-300">{days} days</p>
      <div className="flex gap-2.5 mt-2">
        {['m', 't', 'w', 't', 'f', 's', 's'].map((day, index) => (
          <div
            key={`${day}-${index}`}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-md ${index < days ? 'bg-orange-300 text-red-600' : 'bg-black/50 text-gray-500'}`}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WinStreak;

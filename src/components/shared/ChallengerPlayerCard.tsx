import Image from 'next/image';

interface ChallengerPlayerCardProps {
  username: string;
  rank: number;
  onChallenge: () => void;
}

export default function ChallengerPlayerCard({ 
  username, 
  rank,
  onChallenge
}: ChallengerPlayerCardProps) {
  return (
    <div className="relative w-full h-[100px] mb-4  cursor-pointer group transition-all duration-300">
      {/* Base SVG Background */}
      <div 
        className="absolute inset-0 w-full z-0 h-full bg-contain bg-no-repeat bg-center"
        style={{ 
          backgroundImage: "url('/player_card.svg')",
          backgroundSize: '100% 100%'
        }}
      />
      
      {/* Username and rank overlay - positioned in the text area of the card */}
      <div className="absolute left-[200px] top-1/2 transform -translate-y-1/2 z-10">
        <p className="text-white font-bold text-sm tracking-wider orbitron uppercase group-hover:text-orange-200 transition-colors duration-300 drop-shadow-lg">
          {username}
        </p>
        <p className="text-orange-200 text-xs orbitron">
          Rank: #{rank}
        </p>
      </div>
      
      {/* Challenge button - positioned on the right side of the card */}
      <div className="absolute right-[100px]  top-[42px] transform -translate-y-1/2 z-10">
        <button
          onClick={onChallenge}
          className="  text-white px-2 py-1 rounded-md text-xs font-medium transition-colors duration-200 group-hover:scale-110"
          title="Challenge Player"
        >
          <Image src="/sword.png" alt="Challenge" width={32} height={32} className="mx-auto" />
        </button>
      </div>
      
    </div>
  );
}
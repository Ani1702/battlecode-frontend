import Image from 'next/image';

interface ChallengerPlayerCardProps {
  username: string;
  onChallenge: () => void;
  isPending: boolean;
}

export default function ChallengerPlayerCard({ 
  username, 
  onChallenge,
  isPending
}: ChallengerPlayerCardProps) {
  return (
    <div className={`relative w-full h-[100px] mb-4 group transition-all duration-300 ${isPending ? 'opacity-50' : 'cursor-pointer'}`}>
      <div 
        className="absolute inset-0 w-full z-0 h-full bg-contain bg-no-repeat bg-center"
        style={{ 
          backgroundImage: "url('/player_card.svg')",
          backgroundSize: '100% 100%'
        }}
      />
      
      <div className="absolute left-[200px] top-1/2 transform -translate-y-1/2 z-10">
        <p className="text-white font-bold text-sm tracking-wider orbitron uppercase group-hover:text-orange-200 transition-colors duration-300 drop-shadow-lg">
          {username}
        </p>
        {isPending && (
           <p className="text-yellow-400 text-xs orbitron">
            Request Sent...
          </p>
        )}
      </div>
      
      <div className="absolute right-[100px] top-[42px] transform -translate-y-1/2 z-10">
        <button
          onClick={onChallenge}
          disabled={isPending}
          className="text-white px-2 py-1 rounded-md text-xs font-medium transition-transform duration-200 group-hover:scale-110 disabled:scale-100 disabled:cursor-not-allowed"
          title={isPending ? "Challenge Sent" : "Challenge Player"}
        >
          <Image 
            src="/sword.png" 
            alt="Challenge" 
            width={32} 
            height={32} 
            className={`mx-auto ${isPending ? 'animate-pulse' : ''}`} 
          />
        </button>
      </div>
    </div>
  );
}
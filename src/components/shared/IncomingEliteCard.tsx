interface IncomingEliteCardProps {
  username: string;
  rank: number;
  onAccept: () => void;
  onDeny: () => void;
}

export default function IncomingEliteCard({ 
  username, 
  rank,
  onAccept,
  onDeny
}: IncomingEliteCardProps) {
  return (
    <div className="relative w-full h-[100px] mb-4 hover:scale-105 cursor-pointer group transition-all duration-300">
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
      
      {/* Action buttons for accept/deny - positioned on the right side of the card */}
      <div className="absolute right-[100px] top-1/2 transform -translate-y-1/2 z-10 flex flex-row gap-1">
        <button
          onClick={onAccept}
          className="w-8 h-8  relative  bottom-[5px] bg-green-500 hover:bg-green-600 rounded-sm flex items-center justify-center transition-colors duration-200 group-hover:scale-110"
          title="Accept Challenge"
        >
          <img src="/tick.png" alt="Accept" className="w-4 h-4" />
        </button>
        <button
          onClick={onDeny}
          className="w-8 h-8 bg-red-500 hover:bg-red-600 bottom-[5px] rounded-sm relative  flex items-center justify-center transition-colors duration-200 group-hover:scale-110"
          title="Deny Challenge"
        >
          <span className="text-white font-bold text-sm leading-none">×</span>
        </button>
      </div>
      
    </div>
  );
}
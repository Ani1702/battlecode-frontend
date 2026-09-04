interface PlayerCardProps {
  username: string;
  avatar: string; // The avatar prop is defined but not used in the final JSX
}

// Corrected the function signature to only destructure the 'username' prop as 'avatar' is not used.
export default function PlayerCard({ username }: PlayerCardProps) {
  return (
    <div className="relative w-full h-[100px] mb-4 hover:scale-105 cursor-pointer group transition-all duration-300">
      {/* Base SVG Background */}
      <div
        className="absolute inset-0 w-full z-0 h-full bg-contain bg-no-repeat bg-center"
        style={{
          backgroundImage: "url('/player_card.svg')",
          backgroundSize: "100% 100%",
        }}
      />

      {/* Avatar overlay (kept commented as in your original code) */}
      {/*
      <div className="absolute left-[20px] top-1/2 transform -translate-y-1/2 z-10">
        <div className="w-16 h-16 rounded-sm overflow-hidden bg-gray-800/80 flex items-center justify-center group-hover:bg-gray-700/80 transition-all duration-300 border-2 border-orange-400/50">
          <img
            src={avatar}
            alt={`${username}'s avatar`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 grayscale group-hover:grayscale-0"
          />
        </div>
      </div>
      */}

      {/* Username overlay - Positioned correctly and handles overflow */}
      <div className="absolute left-[95px] right-[25px] top-1/2 transform -translate-y-1/2 z-10">
        <p className="text-white font-bold text-sm z-10 tracking-wider orbitron uppercase group-hover:text-orange-200 transition-colors duration-300 drop-shadow-lg truncate">
          {username}
        </p>
      </div>
    </div>
  );
}

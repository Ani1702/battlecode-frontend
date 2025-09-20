interface PlayerCardProps {
  username: string;
  avatar: string;
}

export default function PlayerCard({ username, /*avatar*/ }: PlayerCardProps) {
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
      
      {/* Avatar overlay - positioned over the left dark section
      <div className="absolute left-[20px] top-1/2 transform -translate-y-1/2 z-10">
        <div className="w-16 h-16 rounded-sm overflow-hidden bg-gray-800/80 flex items-center justify-center group-hover:bg-gray-700/80 transition-all duration-300 border-2 border-orange-400/50">
          <img 
            src={avatar} 
            alt={`${username}'s avatar`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 grayscale group-hover:grayscale-0"
            onError={(e) => {
              // Fallback to a default user icon
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0iIzk5OTk5OSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMCA5YTMgMyAwIDEwMC02IDMgMyAwIDAwMCA2em0tNyA5YTcgNyAwIDAxMTQgMEgzeiIgY2xpcC1ydWxlPSJldmVub2RkIiAvPgo8L3N2Zz4K';
            }}
          />
        </div>
      </div> */}
      
      {/* Username overlay - positioned over the text area, replacing "GLITCH" */}
      <div className="ml-4 relative left-[80px] top-1/2 transform -translate-y-1/2 z-10 right-[80px] ">
        <p className="text-white font-bold text-sm  z-10 tracking-wider orbitron uppercase  group-hover:text-orange-200 transition-colors duration-300 drop-shadow-lg">
          {username}
          
        </p>
      </div>
      
    </div>
  );
}

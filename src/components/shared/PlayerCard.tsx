interface PlayerCardProps {
  username: string;
  avatar: string;
}

export default function PlayerCard({ username, avatar }: PlayerCardProps) {
  return (
    <div className="flex items-center bg-orange-500 rounded-lg p-3 shadow-md hover:shadow-xl hover:shadow-orange-600/50 transition-all duration-300 min-h-[60px] mb-10 hover:scale-105 hover:bg-orange-400 cursor-pointer group">
      {/* Avatar section with slightly greater height */}
      <div className="flex-shrink-0 mr-3">
        <div className="w-12 h-14 rounded-full overflow-hidden bg-orange-600 flex items-center justify-center group-hover:bg-orange-500 transition-all duration-300 group-hover:scale-110">
          <img 
            src={avatar} 
            alt={`${username}'s avatar`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              // Fallback to a default avatar or initials if image fails to load
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${username}&background=ea580c&color=fff`;
            }}
          />
        </div>
      </div>
      
      {/* Username section */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate group-hover:text-gray-100 transition-colors duration-300">
          {username}
        </p>
      </div>
      
      {/* Hover indicator */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      </div>
    </div>
  );
}

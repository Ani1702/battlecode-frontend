"use client"
import PlayerCard from '@/components/shared/PlayerCard';
import CustomScrollbar from '@/components/shared/CustomScrollbar';

// Sample player data - replace this with your actual data source
const samplePlayers = [
  { username: "Player1", avatar: "https://ui-avatars.com/api/?name=Player1&background=ea580c&color=fff" },
  { username: "Player2", avatar: "https://ui-avatars.com/api/?name=Player2&background=ea580c&color=fff" },
  { username: "Player3", avatar: "https://ui-avatars.com/api/?name=Player3&background=ea580c&color=fff" },
  { username: "Player4", avatar: "https://ui-avatars.com/api/?name=Player4&background=ea580c&color=fff" },
  { username: "Player5", avatar: "https://ui-avatars.com/api/?name=Player5&background=ea580c&color=fff" },
  { username: "Player6", avatar: "https://ui-avatars.com/api/?name=Player6&background=ea580c&color=fff" },
  { username: "Player7", avatar: "https://ui-avatars.com/api/?name=Player7&background=ea580c&color=fff" },
  { username: "Player8", avatar: "https://ui-avatars.com/api/?name=Player8&background=ea580c&color=fff" },
  { username: "Player9", avatar: "https://ui-avatars.com/api/?name=Player9&background=ea580c&color=fff" },
];

export default function Lobbyr0(){
    return (
        <>
        <div className = "flex flex-col bg-[url('/r0_lobby_bg.svg')] bg-center bg-cover min-h-screen max-h-screen">
            <div className = "flex-1 orbitron  items-center flex flex-col text-7xl" style={{ textShadow: '0 0 10px rgba(217, 119, 6, 1)' }}>
                <p className='flex-1 flex items-end'> ROUND <span className="text-amber-500">&nbsp; 0</span></p>
                <span className = "text-orange-500 text-2xl flex-[0.2]">lobby</span>
            </div>
            <div className='flex-[0.2] text-2xl orbitron ml-40'>
                Participants: {samplePlayers.length}
            </div>
            <div className = "flex-3 p-6 overflow-hidden">
                {/* Custom scrollbar container for overflow handling */}
                <CustomScrollbar className="h-full overflow-y-auto">
                    {/* 3-column grid of player cards */}
                    <div className="grid grid-cols-3 gap-10 max-w-6xl mx-auto ">
                        {samplePlayers.map((player, index) => (
                            <PlayerCard 
                                key={index}
                                username={player.username}
                                avatar={player.avatar}
                            />
                        ))}
                    </div>
                </CustomScrollbar>
            </div>

        </div>
        
        </>

    );
}
"use client"
import PlayerCard from '@/components/shared/PlayerCard';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
   { username: "Player1", avatar: "https://ui-avatars.com/api/?name=Player1&background=ea580c&color=fff" },
  { username: "Player2", avatar: "https://ui-avatars.com/api/?name=Player2&background=ea580c&color=fff" },
  { username: "Player3", avatar: "https://ui-avatars.com/api/?name=Player3&background=ea580c&color=fff" },
  { username: "Player4", avatar: "https://ui-avatars.com/api/?name=Player4&background=ea580c&color=fff" },
  { username: "Player5", avatar: "https://ui-avatars.com/api/?name=Player5&background=ea580c&color=fff" },
  { username: "Player6", avatar: "https://ui-avatars.com/api/?name=Player6&background=ea580c&color=fff" },
  { username: "Player7", avatar: "https://ui-avatars.com/api/?name=Player7&background=ea580c&color=fff" },
  { username: "Player8", avatar: "https://ui-avatars.com/api/?name=Player8&background=ea580c&color=fff" },
  { username: "Player9", avatar: "https://ui-avatars.com/api/?name=Player9&background=ea580c&color=fff" },
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
    const [matchfound, setmatchfound] = useState(true);
    const [countdown, setCountdown] = useState(5);
    const router = useRouter();
     

    // Countdown timer when match is found
    useEffect(() => {
        if (matchfound && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);

            return () => clearTimeout(timer);
        } else if (matchfound && countdown === 0) {
            // Redirect to r1 code room
            console.log("Redirecting to code room...");
            router.push('/r1/code');
        }
    }, [matchfound, countdown, router]);
    return (
        <>
        <div className = "flex flex-col bg-[url('/r0_lobby_bg.svg')] bg-center bg-cover h-screen">
            <div className = "flex-shrink-0 orbitron items-center flex flex-col text-7xl" style={{ textShadow: '0 0 10px rgba(217, 119, 6, 1)' }}>
                <p className='flex-1 flex items-end pt-8'> <span className = "text-white">ROUND</span> <span className="text-orange-500">&nbsp; 1</span></p>
                <span className = "text-orange-500 text-2xl pb-4">LOBBY</span>
            </div>
            <div className='flex-shrink-0 text-2xl orbitron ml-40 pb-4'>
                Participants: {samplePlayers.length}
            </div>
            <div className = "flex-1 p-6 min-h-0">
                {/* Custom scrollbar container for overflow handling */}
                <CustomScrollbar className="h-full overflow-y-auto">
                    {/* 3-column grid of player cards */}
                    <div className="grid grid-cols-3 gap-12 max-w-6xl mx-auto pb-6">
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

             {matchfound && (
            <div className="flex-shrink-0 h-12 flex items-start  justify-center text-2xl orbitron">
                Match starting in.. {countdown}
            </div>
        )}

        </div>
        
        
        </>

    );
}



"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import BarChart from "@/components/shared/BarChart";
import Button from "@/components/shared/button";
import PieChart from "@/components/shared/Piechart";
import ContributionsGrid from "@/components/shared/ContributionsGrid";
import Rewards from "@/components/shared/Rewards";
import Navbar from "@/components/shared/Navbar";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const timeSpentData = {
    labels: ['Coding', 'Analysing', 'Practice', 'Other'],
    values: [45, 25, 15, 15],
    colors: ['#ff6b00', '#dc2626', '#f59e0b', '#9ca3af'],
  };

  const matchesData = {
    labels: ['Won', 'Lost', 'Tie'],
    values: [12, 6, 2],
    colors: ['#22c55e', '#ef4444', '#f59e0b'],
  };
  const totalMatches = matchesData.values.reduce((a, b) => a + b, 0);

  // Mock data for the contributions grid (7 rows, 32 columns)
  const contributionsData = new Array(7 * 32).fill(0);
  contributionsData[75] = 1; // Corresponds to a red block in the grid
  contributionsData[157] = 1; // Corresponds to another red block

  const userBadges = [
    { id: 1, name: 'FIRST MATCH', imageUrl: 'b-1.svg' },
    { id: 2, name: 'FIRST WIN', imageUrl: 'b-2.svg' },
    { id: 3, name: '5 DAY STREAK', imageUrl: 'b-3.svg' },
    { id: 4, name: '10 DAY STREAK', imageUrl: 'b-4.svg' },
    { id: 5, name: 'FIRST MATCH 2', imageUrl: 'b-1.svg' },
    { id: 6, name: 'FIRST WIN 2', imageUrl: 'b-2.svg' },
    { id: 7, name: '5 DAY STREAK 2', imageUrl: 'b-3.svg' },
    { id: 8, name: '10 DAY STREAK 2', imageUrl: 'b-4.svg' },
  ];

  const handleBadgeClick = (badge: any) => {
    console.log('Badge clicked:', badge.name);
    alert(`You clicked on ${badge.name}!`);
  };

  const handleJoinClick = () => {
    console.log('Join button clicked');
    router.push('/join');
  };

  const handleCreateClick = () => {
    console.log('Create button clicked');
    router.push('/create');
  };

  return (
    <div className="flex flex-col min-h-screen background relative">
      <div className = "w-full h-20">
        <Navbar/>
      </div>
      <div className="min-h-screen flex justify-center h-[100vh] relative z-10">
        <div className="flex justify-between items-center flex-col p-4 w-[80vw] h-full">
          <div className="flex flex-0.5"></div>

          <div className="flex flex-0.8 h-32 w-full">
            <div className="relative flex-1 h-full rounded-lg p-6 flex flex-col justify-center overflow-hidden">
              {/* Background Gradient Arc */}
              <div className="absolute -bottom-1/2 -right-1/4 w-full h-full rounded-full "/>

              {/* Content */}
              <div className="relative z-10">
                <p className="text-gray-400 text-lg font-oxanium">Welcome</p>
                <h1 className="text-white text-3xl font-bold font-orbitron tracking-wider my-1 uppercase">{user?.email?.split('@')[0] || 'USER'}</h1>
                <p className="text-white text-2xl font-oxanium flex items-center">
                  <span className="text-yellow-400 mr-2">⭐</span>
                  2450
                </p>
              </div>
            </div>
            <div className="flex-1 rounded-lg flex items-center justify-center text-gray-800"></div>
            <div className="flex-1 h-32 rounded-lg flex items-center justify-center text-gray-800 gap-5 relative z-20">
              <Button content="JOIN" onClick={handleJoinClick}/>
              <Button content="CREATE" onClick={handleCreateClick}/>
            </div>
          </div>

          <div className="flex flex-[0.1] w-full"></div>          
          <div className="flex flex-[1] gap-20 px-6 w-full relative z-10">
            <div 
              className="flex-1  h-11/13 rounded-2xl bg-black/40 backdrop-blur-sm flex flex-col gradient-border-button shadow-[0_0_20px_rgba(220,38,38,0.3)]">
              <p className="text-gray-200 text-center flex-[0.3] flex justify-center items-center font-oxanium mb-4 text-3xl">QUESTIONS SOLVED</p>
              <div className="flex-1 w-full">
                <BarChart  data = {[2, 9, 13]}/>
              </div>
            </div>


            <div className="flex-1 h-11/13 rounded-2xl bg-black/40 backdrop-blur-sm p-6 flex flex-col items-center justify-around gradient-border-button">
              <h3 className="text-3xl font-oxanium text-gray-200 tracking-widest">WINNING STREAK</h3>
              <div className="text-7xl my-2">
                <img src = "./fire.svg" className = "h-fit w-fit"/>
              </div>
              <p className="text-lg text-gray-300">4 days</p>
              <div className="flex gap-2.5 mt-2">
                {['m', 't', 'w', 't', 'f', 's', 's'].map((day, index) => (
                  <div
                    key={`${day}-${index}`}
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold font-oxanium text-md ${index < 4 ? 'bg-orange-300 text-red-600' : 'bg-black/50 text-gray-500'}`}>
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      


      <div className="min-h-screen flex text-white justify-center h-[100vh] relative z-10">
        <div className="flex justify-between items-center flex-col w-[80vw] h-full">

          <div className="flex flex-0.2 w-full h-5 bg-white"></div>

          <div className="flex flex-1 w-[75vw] gap-4 bg-black/40 backdrop-blur-sm border border-red-500/30 rounded-2xl p-2">
            <PieChart data={matchesData} centerTextTop="MATCHES" centerTextBottom={`${totalMatches} Matches`} />
            <PieChart data={timeSpentData} centerTextTop="TIME SPENT" centerTextBottom="8 Hours" />
          </div>

          <div className="flex flex-0.5 w-full h-5"></div>

          <div className="flex flex-1 w-[77vw]">
            <ContributionsGrid data={contributionsData} />
          </div>
          <div className="flex flex-0.5 w-full h-15"></div> 
         
          <div className="w-[77vw] mt-10 relative z-20">
            <Rewards badges={userBadges} onBadgeClick={handleBadgeClick} />
          </div>

        </div>
      </div>
    </div>



  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-lg w-2xl h-[40vw] flex flex-col items-center justify-center shadow-lg"></div>
  );
}

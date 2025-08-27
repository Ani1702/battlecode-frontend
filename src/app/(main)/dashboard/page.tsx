"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import BarChart from "@/components/shared/BarChart";
import Button from "@/components/shared/button";
import PieChart from "@/components/shared/Piechart";
import ContributionsGrid from "@/components/shared/ContributionsGrid";
import Rewards from "@/components/shared/Rewards";
import Navbar from "@/components/shared/Navbar";
import { useState } from "react";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [islocked, setlocked] = useState([false, true, true, true]);
  const titles = ["Qualifier", "Head to Head", "Elite Bounties", "The Final Hack"]
  const leaderboard_titles = ["Rank", "Player", "Score", "Trend"];
  const leaderboard = [
    [1, "cypher", 2450, ""],
    [2, "glitch", 2300, ""],
    [3, "reaver", 2288, ""],
    [4, "sentinel", 2150, ""],
    [5, "omen", 2000, ""],
    [6, "vex", 1950, ""],
    [7, "jett", 1800, ""],
    [8, "raze", 1750, ""],
    [9, "sage", 1720, ""],
    [10, "phoenix", 1700, ""],
    [11, "brimstonesdsdfsdfsfsfsdfdfssdfdf", 1680, ""],
    [12, "yoru", 1650, ""],
    [13, "skye", 1620, ""],
    [14, "breach", 1600, ""],
    [15, "astra", 1580, ""],
    [16, "harbor", 1550, ""],
    [17, "neon", 1530, ""],
    [18, "fade", 1500, ""],
    [19, "chamber", 1480, ""],
    [20, "deadlock", 1450, ""],
    [21, "gekko", 1430, ""],
    [22, "iso", 1400, ""],
    [23, "kay/o", 1380, ""],
    [24, "killjoy", 1350, ""],
    [25, "clove", 1330, ""],
    [26, "sova", 1300, ""],
    [27, "reyna", 1280, ""],
    [28, "duelist", 1250, ""]
  ];

  return (
    <>
      <div className="bg-[url('/bg-dashboard.svg')] min-h-screen bg-cover bg-center">
        <div className="h-screen w-full flex">
          <div className="flex-[1.5]  h-full w-full flex flex-col">
            <div className="flex-1 ">
              <p>{"<> BattleCode Arena"}</p>
            </div>
            <div className="flex-1   text-lg">
              <p className = "text-5xl pl-8">Competition<span className="text-5xl text-amber-700"> Rounds</span></p>
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div className={`flex-[1.2] flex justify-center items-center pb-5`} key={i}>
                <div className="w-[95%] h-[90%] rounded-2xl flex glass-box justify-center items-center pl-5">
                  <div className={`flex-[0.5] rounded-[50%] w-[70%] h-[70%] ml-5 ${islocked[i]?"":"border-amber-600"} m-1 items-center justify-center flex border-4`}>
                    <p className = "text-3xl">{i}</p>
                  </div>
                  <div className="flex-5 flex flex-col ml-5">
                    <div className="flex-2 text-3xl font-bold">
                      <p>{titles[i]}</p>
                    </div>
                    <div className="flex-1">
                      <p>{islocked[i] ? "Active" : "Locked"}</p>
                    </div>
                  </div>
                  <div className={`flex-[0.5] flex justify-center items-center`}>
                    {
                      islocked[i]?<img src="/lock.svg" />:<div className="w-4 h-4 bg-orange-500 rounded-lg"></div>
                    }
                    
                    
                  </div>
                </div>
              </div>
            ))}
            <div className="flex-2 justify-center items-center flex">

            </div>
          </div>
          <div className="flex-1  h-full w-full flex justify-center items-end ">
            <div className="w-[95%] h-[85%] rounded-lg border-2 mb-4 flex flex-col glass-box">
              <div className="flex-1  justify-center items-center flex">
                
                  <img src="/leaderboard-img.svg" className="w-4 h-4 mr-2"/><span></span>
                  <p className="text-2xl text-orange-500">Live Leaderboard</p>
              </div>
              <div className="flex-7 overflow-x-auto px-4 pb-4">
                <table className="min-w-full text-left text-sm  text-white">
                  <thead>
                    <tr className="border-b border-gray-700">
                      {leaderboard_titles.map((title, idx) => (
                        <th key={idx} className="py-2 px-3 font-bold">{title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, idx) => (
                      <tr key={idx} className=" border-gray-800 hover:bg-white/5 transition">
                        {row.map((cell, cidx) => (
                          <td key={cidx} className="py-2 px-3">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

        </div>
      </div>

    </>

  )

};



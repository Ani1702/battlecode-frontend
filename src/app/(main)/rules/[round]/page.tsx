"use client"
import { useParams } from "next/navigation";

export default function Rules() {
    const params = useParams();
    const round = params.round; // This will give you the value from the URL
    const rules = ["Winning grants you more points on the leaderboard.", "Winning grants you more points on the leaderboard.", "Winning grants you more points on the leaderboard."];

    return (
        <>
            <div className="bg-[url('/rule-bg.svg')] bg-cover min-h-screen flex justify-center items-center">
                <div className="h-[60vh] w-[60vw] glass-box flex rounded-2xl justify-center items-center">
                    <div className="flex-[2.3]  h-full w-full flex flex-col ml-10 mb-10 mr-10 mt-10 justify-center items-center">
                        <div className = "w-[80%] h-[80%] flex flex-col">
                        <p className="flex-1 mt-5 font-bold">Read and accept the rules to continue</p>
                        <div className="flex-[5]">
                            {
                                rules.map((rule, i) => (
                                    <p key={i}>{rule}</p>
                                ))
                            }
                        </div>

                        <p className="flex-1">
                            <input type="checkbox" className="border-amber-500" />
                            <span> I have read and agree to all the rules</span>
                        </p>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 w-full h-full flex">
                            <p>Round {round}</p>
                            <p>Rules</p>
                        </div>
                        <div className="flex-[5] flex  items-end">
                            <button
                                className="px-6 py-2 rounded-lg border-1 border-amber-200 bg-gradient-to-r  text-white font-bold shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:from-yellow-400 hover:to-amber-500 hover:shadow-amber-200/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            >
                                Proceed To Lobby
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </>
    )
};
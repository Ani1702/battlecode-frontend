"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function RulesPage({ rules, round }: { rules: string[]; round: string | string[] }) {
    const router = useRouter();
    const [isChecked, setIsChecked] = useState(false);

    // Ensure round is always a string
    const roundString = Array.isArray(round) ? round[0] : round || "0";

    return (
        <div className="bg-[url('/rule-bg.svg')] bg-cover min-h-screen flex justify-center items-center">
            <div className="h-[60vh] w-[60vw] glass-box flex rounded-2xl justify-center items-center">
                <div className="flex-[2.3]  h-full w-full flex flex-col ml-10 mb-10 mr-10 mt-10 justify-center items-center">
                    <div className="w-[90%] h-[80%] flex flex-col">
                        <p className="flex-1 mt-5  text-xl">Read and accept the rules to continue</p>
                        <div className="flex-[5] font-bold">
                            {rules.map((rule, i) => (
                                <div key={i} className="flex items-start mb-2">
                                    <span className="mr-2 flex-shrink-0">{i + 1}.</span>
                                    <span className="flex-1">{rule}</span>
                                </div>
                            ))}
                        </div>
                        <p className="flex-1">
                            <input
                                type="checkbox"
                                className="border-amber-500"
                                checked={isChecked}
                                onChange={(e) => setIsChecked(e.target.checked)}
                            />
                            <span> I have read and agree to all the rules</span>
                        </p>
                    </div>
                </div>
                <div className="flex-1 flex flex-col h-full p-17 w-full justify-end">
                    <div className="flex-1 w-full h-full flex flex-col justify-end">
                        <p className="flex-1 h-full w-full flex justify-end text-3xl font-bold">Round&nbsp;  <span className="text-orange-600">{roundString}</span></p>
                        <p className="flex-1 h-full w-full flex justify-end">Rules</p>
                    </div>
                    <div className="flex-[5] flex  items-end">
                        <button
                            className={`px-6 py-2 rounded-lg border-1 border-amber-200 font-bold shadow-lg backdrop-blur-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                                isChecked
                                    ? 'bg-gradient-to-r text-white hover:scale-105 hover:from-yellow-400 hover:to-amber-500 hover:shadow-amber-200/40 cursor-pointer'
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                            }`}
                            disabled={!isChecked}
                            onClick={() => router.push('/lobby')}
                        >
                            Proceed To Lobby
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

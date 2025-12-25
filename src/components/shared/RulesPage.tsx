"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CustomScrollbar from "./CustomScrollbar";

export default function RulesPage({ rules, round }: { rules: string[]; round: string | string[] }) {
    const router = useRouter();
    const [isChecked, setIsChecked] = useState(false);

    // Ensure round is always a string
    const roundString = Array.isArray(round) ? round[0] : round || "0";

    return (
        <div className="bg-[url('/rule-bg.svg')] bg-cover bg-center min-h-screen flex justify-center items-center font-oxanium text-white">
            <div className="h-[60vh] w-[70vw] glass-box flex rounded-2xl justify-center items-center">

                {/* Left Column: Increased flex-grow to give more width */}
                <div className="flex-[3] h-full flex flex-col p-10 justify-center items-center">
                    <div className="w-full h-full flex flex-col">
                        {/* Club Logo */}
                        <div className="flex-shrink-0 flex justify-start mb-4">
                            <img
                                src="/logo.png"
                                alt="IEEE-CS Logo"
                                className="h-12 w-auto object-contain drop-shadow-[0_4px_8px_rgba(249,115,22,0.6)]"
                            />
                        </div>
                        <p className="flex-shrink-0 mt-5 text-xl font-bold">Read and accept the rules to continue</p>

                        {/* Rules list is now scrollable if content overflows */}
                        <CustomScrollbar className="flex-grow my-4 pr-2 oxanium overflow-y-auto">
                            {rules.map((rule, i) => (
                                <div key={i} className="flex items-start mb-2">
                                    <span className="mr-2 flex-shrink-0">{i + 1}.</span>
                                    <span className="flex-1">{rule}</span>
                                </div>
                            ))}
                        </CustomScrollbar>

                        <div className="flex-shrink-0">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded-sm border-gray-500 bg-transparent accent-orange-500"
                                    checked={isChecked}
                                    onChange={(e) => setIsChecked(e.target.checked)}
                                />
                                <span className="ml-3 oxanium"> I have read and agree to all the rules</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Column: Kept original structure, fixed padding */}
                <div className="flex-1 flex flex-col h-full p-12 justify-between">
                    <div className="w-full text-right">
                        <p className="text-3xl font-bold drop-shadow-[0_4px_8px_rgba(249,115,22,0.8)]">Round <span className="text-orange-600">{roundString}</span></p>
                        <p className="text-xl drop-shadow-[0_4px_8px_rgba(249,115,22,0.8)]">Rules</p>
                    </div>
                    <div className="flex justify-end items-end">
                        <button
                            className={`px-6 py-2 rounded-lg border-1 oxanium border-orange-500 font-bold shadow-lg backdrop-blur-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 ${isChecked
                                ? 'bg-gradient-to-r text-white hover:scale-105 from-orange-500 to-amber-600 hover:shadow-amber-200/40 cursor-pointer'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                                }`}
                            disabled={!isChecked}
                            onClick={() => router.push(`/r1/lobby`)}
                        >
                            Proceed To Lobby
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


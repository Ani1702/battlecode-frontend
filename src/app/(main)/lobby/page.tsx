export default function Lobby() {
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
            <div className="flex  bg-[url('/lobby-bg')]  bg-cover min-h-screen flex-col ">
                <div className="flex-[3]">
                    <p> {"<> Battle Arena"}</p>
                </div>
                <div className="flex-[7] flex">
                    <div className="flex-[5]">

                    </div>
                    <div className="flex-[3] flex flex-col">

                        <div className="max-h-[80vh] h-[80vh] rounded-lg border-2 mb-4 mr-8 flex flex-col glass-box overflow-y-auto">
                            <div className="flex-1  justify-center items-center flex">

                                <img src="/leaderboard-img.svg" className="w-4 h-4 mr-2" /><span></span>
                                <p className="text-2xl text-orange-500">Live Leaderboard</p>
                            </div>
                            <div className="flex-[7] overflow-x-auto px-4 pb-4 max-w-full">
                                <table className="min-w-max text-left text-sm text-white">
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


                        {/* <div className="overflow-x-auto px-4 pb-4 flex-[7] h-[60%] w-[95%] border-amber-600">
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
              </div>*/}

                    </div>
                </div>
            </div>
        </>

    )
}
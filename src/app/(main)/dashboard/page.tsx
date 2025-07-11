"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import BarChart from "@/components/shared/BarChart";
import Button from "@/components/shared/button";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <>
      <div className="min-h-screen bg-[url('/bg.svg')] bg-cover bg-center flex text-white justify-center h-[100vh] font-oxanium">
        <div className="flex justify-between items-center flex-col p-4 w-[80vw] h-full">
          <div className="w-full flex-0.5 h-22 mb-4 bg-white">
            <Navbar />
          </div>

          <div className="flex flex-0.8 h-32 w-full">
            <div className="flex-1 bg-amber-200 h-32 rounded-lg flex items-center justify-center text-gray-800">
              hellow
            </div>
            <div className="flex-1 bg-red-100 h-32 rounded-lg flex items-center justify-center text-gray-800">
              hellow
            </div>
            <div className="flex-1 h-32 rounded-lg flex items-center justify-center text-gray-800 gap-5">
              <Button content="JOIN" onClick={() => router.push("/join")} />
              <Button content="CREATE" onClick={() => router.push("/create")} />
            </div>
          </div>

          <div className="flex flex-0.5 w-full h-15"></div>
          <div className="flex flex-2 gap-4 px-6 w-full ">
            <div
              className="flex-1 p-4 h-fill rounded-lg bg-black/50 flex flex-col border-2 border-transparent"
              style={{
                background: "rgba(0, 0, 0, 0.5)",
                borderImage:
                  "linear-gradient(45deg, #fbbf24, #f59e0b, #d97706) 1",
                borderRadius: "0.5rem",
              }}
            >
              <p className="text-white text-center flex-[0.3] flex justify-center items-center font-oxanium mb-4 text-3xl">
                QUESTIONS SOLVED
              </p>
              <div className="flex-1 w-full">
                <BarChart />
              </div>
            </div>

            <div className="flex-1 border border-amber-600 p-4 h-fill rounded-lg flex flex-col items-center justify-center text-gray-800">
              <div className="flex-[0.23] flex items-center justify-center">
                <p className="font-oxanium text-white text-3xl">
                  WINNING STREAK
                </p>
              </div>
              <div className="flex-[0.4]">
                <img
                  src="/fire.svg"
                  className="h-40 w-auto object-contain"
                  alt="fire"
                />
              </div>
              <div className="flex-[0.1]">
                <p className="text-white text-2xl fonr-oxanium">3 days</p>
              </div>
              <div className="flex-[0.27]"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-[url('/bg.svg')] bg-cover bg-center flex text-white justify-center h-[100vh]">
        <div className="flex justify-between items-center flex-col w-[80vw] h-full">
          '<div className="flex flex-0.5 w-full bg-white h-10"></div>
          <div className="flex flex-1 h-32 w-full bg-blue-500"></div>
          <div className="flex flex-0.5 w-full bg-white h-15"></div>
          <div className="flex flex-1 h-32 w-full bg-red-500"></div>
          <div className="flex flex-0.5 w-full bg-white h-15"></div>
          <div className="flex flex-1 h-32 w-full bg-green-500"></div>
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-lg w-2xl h-[40vw] flex flex-col items-center justify-center shadow-lg"></div>
  );
}

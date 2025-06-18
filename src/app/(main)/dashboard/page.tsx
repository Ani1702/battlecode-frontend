"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome, {user?.email}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:bg-blue-50 transition"
          onClick={() => router.push("/create")}
        >
          <h2 className="text-xl font-semibold mb-2">Create Room</h2>
          <p className="text-gray-600">Start a new coding battle</p>
        </div>

        <div
          className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:bg-blue-50 transition"
          onClick={() => router.push("/join")}
        >
          <h2 className="text-xl font-semibold mb-2">Join Room</h2>
          <p className="text-gray-600">Enter an existing battle</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard title="Matches Played" value="12" />
          <StatCard title="Win Rate" value="75%" />
          <StatCard title="Rank" value="#42" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

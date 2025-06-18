import GoogleButton from "@/components/auth/GoogleButton";

export default function Home() {
  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">BattleCode</h1>
      <p className="text-gray-600 mb-8">
        A competitive programming platform where you can challenge others in
        real-time coding battles.
      </p>
      <div className="flex justify-center">
        <GoogleButton />
      </div>
    </div>
  );
}

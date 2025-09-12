"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function SignOut() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2  bg-white/5 border-orange-500 border-2 hover:scale-110   hover:bg-orange-600 hover:transition-transform text-white font-oxanium rounded-lg transition-colors duration-200"
    >
      Sign Out
    </button>
  );
}

import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center flex-col bg-black text-center">
      <Image
        src="/battlecode_logo.png"
        alt="Battlecode Logo"
        className="h-100"
        width={400}
        height={400}
      />
      <h1 className="text-6xl font-bold text-orange-600">404</h1>
      <p className="mt-4 text-xl text-white">This page could not be found.</p>
      <Link
        href="/dashboard"
        className="mt-6 px-6 py-2 bg-black border-orange-500 border-2 text-white rounded-lg hover:bg-orange-600 hover:scale-110 transition-transform"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

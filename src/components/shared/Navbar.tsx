"use client";
import Link from "next/link"; 
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const { user, signOut } = useAuth();
  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 border-radius rounded-full">         
     <div className="border rounded-full border-gray-300 bg-gradient-to-r from-black to-transparent flex items-center w-[70vw] h-12 py-3 px-6">
        <div className="flex justify-between w-[60vw] px-4 transform translate-x-20">
          <button>
            <img src="/logo.svg" className="justify-start h-6 w-auto object-contain" alt="Logo" />
          </button>
          <button>
            <img src="/menu.svg" className="justify-end h-6 w-auto object-contain" alt="Menu" />
          </button>
        </div>
      </div>
    </nav>
  );
}

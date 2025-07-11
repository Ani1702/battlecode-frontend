"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 border-radius rounded-full">
      <div className="border rounded-full border-gray-600 bg-gradient-to-r from-black to-transparent flex items-center w-[70vw] h-12 py-3 px-6">
        <div className="flex justify-between w-[60vw] px-4 transform translate-x-20">
          <Link href="/dashboard">
            <img
              src="/logo.svg"
              className="justify-start h-6 w-auto object-contain cursor-pointer"
              alt="Logo"
            />
          </Link>
          <div className="relative">
            <button onClick={toggleMenu}>
              <img
                src="/menu.svg"
                className="justify-end h-6 w-auto object-contain"
                alt="Menu"
              />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-black/80 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg py-2 z-10">
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-white hover:bg-gray-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-white hover:bg-gray-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        signOut();
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/"
                    className="block px-4 py-2 text-white hover:bg-gray-700"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

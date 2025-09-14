"use client";

import UsernamePopup from "@/components/shared/UsernamePopup";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode, useState, useEffect } from "react";
import { Oxanium } from "next/font/google";
import "../globals.css";

// Add Oxanium font
const oxanium = Oxanium({
  subsets: ["latin"],
  variable: "--font-oxanium",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, hasUsername, isLoading } = useAuth();
  const [showUsernamePopup, setShowUsernamePopup] = useState(false);

  useEffect(() => {
    // Show popup if user is logged in but doesn't have a username
    if (!isLoading && user && hasUsername === false) {
      setShowUsernamePopup(true);
    } else {
      setShowUsernamePopup(false);
    }
  }, [user, hasUsername, isLoading]);

  const handlePopupClose = () => {
    setShowUsernamePopup(false);
  };

  return (
    <div className={`min-h-screen flex ${oxanium.variable}`}>
      <div className="flex-1">
        <main className="h-full font-oxanium relative z-0">{children}</main>
      </div>
      
      <UsernamePopup 
        isOpen={showUsernamePopup} 
        onClose={handlePopupClose}
      />
    </div>
  );
}

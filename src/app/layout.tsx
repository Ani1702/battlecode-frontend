import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";

import type { Metadata } from "next";
// import { Orbitron, Oxanium } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';



export const metadata: Metadata = {
  title: "BattleCode IEEE-CS VIT",
  description: "One v One Gamified Programming Platform",
};

// const oxanium = Oxanium({
//   variable: "--font-oxanium",
//   subsets: ["latin"],
// });

// const orbitron = Orbitron({
//   variable: "--font-orbitron",
//   subsets: ["latin"],
// });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`oxanium antialiased`}>
        <AuthProvider>
          
            <SocketProvider>{children}<Toaster /></SocketProvider>
          
        </AuthProvider>
      </body>
    </html>
  );
}

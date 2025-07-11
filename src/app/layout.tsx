import { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { Oxanium, Orbitron } from "next/font/google";
import Protected from "@/components/shared/Protected";

export const metadata: Metadata = {
  title: "BattleCode IEEE-CS VIT",
  description: "One v One Gamified Programming Platform",
};

const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${oxanium.variable}  ${orbitron.variable} antialiased`}>
        <AuthProvider>
          <Protected>
            <SocketProvider>{children}</SocketProvider>
          </Protected>
        </AuthProvider>
      </body>
    </html>
  );
}

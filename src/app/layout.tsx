import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { Oxanium } from 'next/font/google'
import Protected from "@/components/shared/Protected";

const oxanium = Oxanium({
  subsets: ['latin'],
  weight: ['400', '700'], // Choose weights you need
  display: 'swap',
})


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className = {oxanium.className}>
        
        <AuthProvider>
          <Protected>
            <SocketProvider>{children}</SocketProvider>
          </Protected>
        </AuthProvider>
      </body>
    </html>
  );
}

import Navbar from "@/components/shared/Navbar";
import { ReactNode } from "react";
import { Oxanium } from 'next/font/google'
import '../globals.css';

// Add Oxanium font
const oxanium = Oxanium({
  subsets: ['latin'],
  variable: '--font-oxanium',
  weight: ['200', '300', '400', '500', '600', '700', '800']
})


export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    
    <div className={`min-h-screen flex ${oxanium.variable}`}>
      <div className="flex-1">
        <Navbar />
        <main className="h-full font-oxanium">{children}</main>
      </div>
    </div>
  
  );
}

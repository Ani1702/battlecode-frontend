import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import MobileOnly from "@/components/MobileOnly";

export const metadata: Metadata = {
  title: "BattleCode IEEE-CS VIT",
  description: "One v One Gamified Programming Platform",
};

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="oxanium antialiased">
        {gaMeasurementId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');
              `}
            </Script>
          </>
        ) : null}
        <MobileOnly>{children}</MobileOnly>
      </body>
    </html>
  );
}

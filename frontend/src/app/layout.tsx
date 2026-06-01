import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import HydrationWrapper from "@/components/HydrationWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MatchUp — TikTok-style Social App",
  description: "MatchUp is your TikTok-lite super app for short video feeds, social connections, and real-time chat.",
  keywords: ["social media", "short videos", "matchup", "tiktok"],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <HydrationWrapper>
          <div className="flex flex-col h-dvh w-full overflow-hidden">
            <div className="flex-1 overflow-hidden relative">
              {children}
            </div>
            <BottomNav />
          </div>
        </HydrationWrapper>
      </body>
    </html>
  );
}

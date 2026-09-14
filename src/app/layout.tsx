import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { DemoDataBanner, Disclaimer } from "@/components/DemoDataBanner";
import { PortfolioProvider } from "@/lib/store/portfolioStore";
import { ImportedDataProvider } from "@/lib/store/importedStore";
import { AuthProvider } from "@/lib/store/authStore";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Indian Stock Portfolio Builder",
  description: "Screen, score, and build a long-term Indian equity portfolio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <AuthProvider>
          <ImportedDataProvider>
            <PortfolioProvider>
              <DemoDataBanner />
              <Nav />
              <main className="flex-1">{children}</main>
              <Disclaimer />
            </PortfolioProvider>
          </ImportedDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

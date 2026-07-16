import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Source_Serif_4, Poppins } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  title: "PatentPilot — AI-Assisted Freedom-to-Operate Workspace",
  description:
    "PatentPilot helps pharmaceutical researchers evaluate whether a newly designed molecule may overlap with existing patents, using AI-assisted retrieval, analysis, and explainable patentability reports.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`dark ${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} ${poppins.variable}`}>
      <body className="font-sans antialiased">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ModalProvider } from "../components/ModalProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MainCue",
  description: "Smart Billiard Reservation Space",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${inter.variable} antialiased selection:bg-orange/20 overflow-hidden`}>
        <ModalProvider>
          {children}
        </ModalProvider>
      </body>
    </html>
  );
}

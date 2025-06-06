import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
// Material Icons import

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LecSum AI - Your AI-Powered Study Companion",
  description: "Transform your learning experience with AI-generated flashcards, quizzes, and chat assistance based on your course materials.",
};

import LecsiChatSidebarClientWrapper from "./LecsiChatSidebarClientWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          {children}
          <LecsiChatSidebarClientWrapper />
        </Providers>
      </body>
    </html>
  );
}

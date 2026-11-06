import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "I'm Syncing! — Your personal workspace",
  description: "A calmer home for your tasks, studies, and connected workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

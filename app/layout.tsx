import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hot Grandpa Generator — Williamsburg Pizza",
  description: "If we can make your grandpa hot, we can make your pizza hot.",
  openGraph: {
    title: "Hot Grandpa Generator",
    description: "If we can make your grandpa hot, we can make your pizza hot.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

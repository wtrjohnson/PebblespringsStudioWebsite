import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pebblesprings Studio",
  description:
    "A dead-simple portfolio for Pebblesprings Studio, a web design studio building clear, sturdy websites.",
  openGraph: {
    title: "Pebblesprings Studio",
    description:
      "Small, sturdy websites for people who need the work to feel clear.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Pebblesprings Studio portfolio preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pebblesprings Studio",
    description:
      "Small, sturdy websites for people who need the work to feel clear.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

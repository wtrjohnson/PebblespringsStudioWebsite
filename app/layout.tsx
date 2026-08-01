import type { Metadata } from "next";
import { SiteFooter } from "./SiteFooter.tsx";
import "./globals.css";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

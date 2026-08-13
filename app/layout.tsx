import type { Metadata } from "next";
import { SiteFooter } from "./SiteFooter.tsx";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pebblesprings Studio",
  description:
    "Make your business look as good as it is. Pebblesprings Studio builds fast, distinctive websites for good businesses.",
  openGraph: {
    title: "Pebblesprings Studio",
    description:
      "Websites that make good businesses look the part—fast, sturdy, and built to feel like yours.",
    type: "website",
    images: [
      {
        url: "/PSLinkPreview.png",
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
      "Websites that make good businesses look the part—fast, sturdy, and built to feel like yours.",
    images: ["/PSLinkPreview.png"],
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
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
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

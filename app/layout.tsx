import type { Metadata } from "next";
import { SiteFooter } from "./SiteFooter.tsx";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pebblesprings.co"),
  title: "Pebblesprings Studio | Website Design & Development",
  description:
    "Fast and distinctive websites built around your business. Strategy, design, and development by Pebblesprings Studio.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Pebblesprings Studio",
    description:
      "Websites that make good businesses look the part—fast, sturdy, and built to feel like yours.",
    type: "website",
    images: [
      {
        url: "/og-home-v4.png",
        width: 1200,
        height: 630,
        alt: "Pebblesprings Studio: fast and distinctive websites built around your business.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pebblesprings Studio",
    description:
      "Websites that make good businesses look the part—fast, sturdy, and built to feel like yours.",
    images: ["/og-home-v4.png"],
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "192x192" }],
    shortcut: "/icon.png",
    apple: [{ url: "/icon.png", sizes: "192x192", type: "image/png" }],
  },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Pebblesprings Studio",
    url: "https://pebblesprings.co",
    logo: "https://pebblesprings.co/icon.png",
    description:
      "Fast and distinctive websites built around your business. Strategy, design, and development by Pebblesprings Studio.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Pebblesprings Studio",
    url: "https://pebblesprings.co",
  },
];

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

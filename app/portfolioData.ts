export type PortfolioProject = {
  id: string;
  eyebrow: string;
  number?: string;
  title: string;
  statement?: string;
  statementColor?: string;
  scope?: string[];
  image: string;
  logo: string;
  url: string;
  media?: ProjectMediaItem[];
  isProposition?: boolean;
};

export type ProjectMediaItem = {
  id: string;
  src: string;
  alt: string;
  kind: "image" | "video";
  className?: string;
  poster?: string;
};

export const carouselProjects: PortfolioProject[] = [
  {
    id: "pebblesprings-studio",
    eyebrow: "Studio Website",
    title: "Pebblesprings Studio",
    image: "/HERO.png",
    logo: "/PSLogo.png",
    url: "https://pebblesprings.co",
    isProposition: true,
  },
  {
    id: "slipstream-advocacy",
    eyebrow: "Federal Advocacy",
    number: "01",
    title: "Slipstream Advocacy",
    statement: "A big feel\nfor a small firm.",
    statementColor: "#D63E36",
    scope: ["Logo", "Design System", "Web Presence"],
    image: "/SlipstreamAdvocacy-Portfolio-1.png",
    logo: "/Slipstream-Logo.svg",
    url: "https://slipstreamadvocacy.com",
    media: [
      {
        id: "homepage",
        kind: "image",
        src: "/SlipstreamAdvocacy-Expanded-Hero.png",
        alt: "Slipstream Advocacy homepage shown in a desktop browser frame",
        className: "media-homepage",
      },
      {
        id: "interior",
        kind: "image",
        src: "/SlipstreamAdvocacy-Expanded-Secondary.png",
        alt: "Slipstream Advocacy interior website page shown in a desktop browser frame",
        className: "media-interior media-overlap-top",
      },
      {
        id: "mobile",
        kind: "image",
        src: "/SlipstreamAdvocacy-Expanded-Mobile.png",
        alt: "Slipstream Advocacy website shown in a narrow mobile viewport",
        className: "media-mobile media-overlap-top",
      },
    ],
  },
  {
    id: "albert-rozin",
    eyebrow: "Music Education",
    number: "02",
    title: "Albert Rozin",
    statement: "A living archive\nfor a musical legacy.",
    statementColor: "#3C6BAA",
    scope: ["Archive", "Web Presence", "Content System"],
    image: "/AlbertRozin-Portfolio-2.png",
    logo: "/AR-Logo.png",
    url: "https://albertrozin.com",
    media: [
      {
        id: "homepage",
        kind: "image",
        src: "/AlbertRozin-Expanded-Hero.png",
        alt: "Albert Rozin website homepage shown in a desktop browser frame",
        className: "media-homepage",
      },
      {
        id: "detail",
        kind: "image",
        src: "/AlbertRozin-Expanded-Secondary.png",
        alt: "Albert Rozin website detail page screenshot",
        className: "media-interior media-overlap-top",
      },
    ],
  },
  {
    id: "r-johnson-piano",
    eyebrow: "Piano Studio",
    number: "03",
    title: "René Johnson Piano Studio",
    statement: "A warmer doorway\nfor new students.",
    statementColor: "#182D6D",
    scope: ["Messaging", "Web Presence", "Local SEO"],
    image: "/RJohnsonPiano-Portfolio-3.png",
    logo: "/RJpiano-Logo.png",
    url: "https://rjohnsonpiano.com",
    media: [
      {
        id: "homepage",
        kind: "image",
        src: "/RJohnsonPiano-Portfolio-3.png",
        alt: "René Johnson Piano Studio website homepage shown in a desktop browser frame",
      },
      {
        id: "detail",
        kind: "image",
        src: "/RJohnsonPiano-Expanded-Secondary.png",
        alt: "René Johnson Piano Studio website page screenshot",
      },
    ],
  },
  {
    id: "clear-policy-strategies",
    eyebrow: "Creative Practice",
    number: "04",
    title: "CPS",
    statement: "A direct presence\nfor policy work.",
    statementColor: "#B72B35",
    scope: ["Positioning", "Identity", "Web Presence"],
    image: "/CPS-Portfolio-4.png",
    logo: "/CPS-Logo.png",
    url: "https://clearpolicystrategies.com",
    media: [
      {
        id: "homepage",
        kind: "image",
        src: "/CPS-Portfolio-4.png",
        alt: "Clear Policy Strategies website homepage shown in a desktop browser frame",
      },
      {
        id: "detail",
        kind: "image",
        src: "/CPS-Expanded-Secondary.png",
        alt: "Clear Policy Strategies website page screenshot",
      },
    ],
  },
];

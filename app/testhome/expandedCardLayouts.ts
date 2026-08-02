export type ExpandedMediaLayout = {
  id: string;
  src: string;
  alt: string;
  top: string;
  left?: string;
  right?: string;
  bottom?: string;
  width?: string;
  height?: string;
  zIndex?: number;
};

export type ExpandedBlockLayout = {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  maxWidth?: string;
};

export type ExpandedCardLayout = {
  copy: ExpandedBlockLayout;
  scope: ExpandedBlockLayout;
  cta: ExpandedBlockLayout;
  media: ExpandedMediaLayout[];
};

// One entry per project id (see app/portfolioData.ts). Every value is a percentage
// of the expanded card's own box, so it scales with the card instead of breaking
// at other frame sizes. Projects without an entry fall back to a single centered
// screenshot in TestHeroGallery.tsx.
export const expandedCardLayouts: Record<string, ExpandedCardLayout> = {
  "slipstream-advocacy": {
    copy: { top: "9%", left: "6%", maxWidth: "26%" },
    scope: { top: "74%", left: "56%", maxWidth: "20%" },
    cta: { bottom: "6%", left: "6%" },
    media: [
      {
        id: "homepage",
        src: "/SlipstreamAdvocacy-Expanded-Hero.png",
        alt: "Slipstream Advocacy homepage",
        top: "21%",
        left: "30%",
        width: "62%",
        zIndex: 2,
      },
      {
        id: "interior",
        src: "/SlipstreamAdvocacy-Expanded-Secondary.png",
        alt: "Slipstream Advocacy interior page",
        top: "61%",
        left: "5%",
        width: "46%",
        zIndex: 3,
      },
      {
        id: "mobile",
        src: "/SlipstreamAdvocacy-Expanded-Mobile.png",
        alt: "Slipstream Advocacy mobile page",
        top: "60%",
        left: "75%",
        width: "16%",
        zIndex: 4,
      },
    ],
  },
  "albert-rozin": {
    copy: { top: "7%", left: "6%", maxWidth: "24%" },
    scope: { top: "75%", left: "64%", maxWidth: "20%" },
    cta: { bottom: "6%", left: "6%" },
    media: [
      {
        id: "homepage",
        src: "/AlbertRozin-Expanded-Hero.png",
        alt: "Albert Rozin homepage",
        top: "19%",
        left: "29%",
        width: "67%",
        zIndex: 2,
      },
      {
        id: "detail",
        src: "/AlbertRozin-Expanded-Secondary.png",
        alt: "Albert Rozin sheet music archive page",
        top: "56%",
        left: "5%",
        width: "53%",
        zIndex: 3,
      },
    ],
  },
  "r-johnson-piano": {
    copy: { top: "7%", left: "6%", maxWidth: "40%" },
    scope: { top: "74%", left: "64%", maxWidth: "20%" },
    cta: { bottom: "6%", left: "6%" },
    media: [
      {
        id: "homepage",
        src: "/RJohnsonPiano-Portfolio-3.png",
        alt: "René Johnson Piano Studio homepage",
        top: "20%",
        left: "28%",
        width: "66%",
        zIndex: 2,
      },
      {
        id: "detail",
        src: "/RJohnsonPiano-Expanded-Secondary.png",
        alt: "René Johnson Piano Studio admin dashboard page",
        top: "51%",
        left: "5%",
        width: "53%",
        zIndex: 3,
      },
    ],
  },
  "clear-policy-strategies": {
    copy: { top: "9%", left: "6%", maxWidth: "24%" },
    scope: { top: "74%", left: "76%", maxWidth: "20%" },
    cta: { bottom: "6%", left: "6%" },
    media: [
      {
        id: "homepage",
        src: "/CPS-PortfolioPiece.svg",
        alt: "Clear Policy Strategies homepage",
        top: "18%",
        left: "31%",
        width: "68%",
        zIndex: 2,
      },
      {
        id: "detail",
        src: "/CPS-Expanded-Secondary.png",
        alt: "Clear Policy Strategies practice area page",
        top: "50%",
        left: "8%",
        width: "57%",
        zIndex: 3,
      },
    ],
  },
};

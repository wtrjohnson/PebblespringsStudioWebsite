"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type MobileNavItem = {
  label: string;
  href?: string;
  onSelect?: () => void;
};

export function MobileNavMenu({ items }: { items: MobileNavItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // The nav swaps item sets as you scroll between scenes; close rather than
  // let a stale menu hang over the new set. Keyed on labels, not array
  // identity, so an unmemoized `items` prop can't force it shut every render.
  const itemSignature = items.map((item) => item.label).join("|");

  useEffect(() => {
    setIsOpen(false);
  }, [itemSignature]);

  const selectItem = (item: MobileNavItem) => {
    setIsOpen(false);
    item.onSelect?.();
  };

  return (
    <div className="mobile-nav-menu" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        className="mobile-nav-toggle"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <div className="mobile-nav-dropdown" hidden={!isOpen}>
        {items.map((item) => item.href ? (
          <Link href={item.href} key={item.label} onClick={() => selectItem(item)}>
            {item.label}
          </Link>
        ) : (
          <button key={item.label} onClick={() => selectItem(item)} type="button">
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

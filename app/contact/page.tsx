import Link from "next/link";
import { ContactForm } from "../ContactForm.tsx";
import { MobileNavMenu } from "../MobileNavMenu.tsx";

const contactNavItems = [
  { label: "Priorities", href: "/#about" },
  { label: "Performance", href: "/#performance" },
  { label: "Work", href: "/" },
  { label: "Contact", href: "/contact" },
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const initialMessage = typeof params?.message === "string" ? params.message : "";

  return (
    <main className="contact-page lower-scene scene-panel" aria-label="Contact Pebblesprings Studio">
      <header className="lower-topbar" aria-label="Pebblesprings Studio navigation">
        <Link className="topbar-brand" href="/" aria-label="Pebblesprings Studio home">
          <img src="/PSLogo.png" alt="" width="32" height="32" />
          <span>
            Pebblesprings
            <br />
            Studio
          </span>
        </Link>
        <nav className="lower-nav" aria-label="Primary navigation">
          {contactNavItems.map((item) => (
            <Link href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </nav>
        <MobileNavMenu items={contactNavItems} />
      </header>
      <ContactForm initialMessage={initialMessage} />
    </main>
  );
}

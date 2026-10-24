import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./ContactForm.tsx";
import "./althome/althome.css";
import "./altcontact/altcontact.css";

export const metadata: Metadata = {
  title: "Start a project | Pebblesprings Studio",
  description: "Tell Pebblesprings Studio about your business and the website you want to build.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const initialMessage = typeof params?.message === "string" ? params.message : "";

  return (
    <main className="alt-home alt-contact-page" aria-label="Contact Pebblesprings Studio">
      <header className="alt-header">
        <Link className="alt-brand" href="/" aria-label="Pebblesprings Studio home">
          <img src="/PSLogo.png" alt="" width="34" height="34" aria-hidden="true" />
          <span>Pebblesprings Studio</span>
        </Link>
        <nav className="alt-nav" aria-label="Primary navigation">
          <Link href="/#work">Work</Link>
          <Link href="/#performance">Performance</Link>
          <Link href="/#priorities">Priorities</Link>
          <a className="alt-nav-cta" href="#contact-form">Start a project</a>
        </nav>
      </header>

      <section className="alt-contact-main" id="contact-form" aria-label="Project inquiry">
        <ContactForm initialMessage={initialMessage} showIntro={false} submitLabel="Send" />
      </section>

      <footer className="alt-footer">
        <p>© 2026 Pebblesprings Studio</p>
        <nav aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/portal/login">Client portal</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </footer>
    </main>
  );
}

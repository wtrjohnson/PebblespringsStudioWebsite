"use client";

import { type FormEvent, useCallback, useRef, useState } from "react";

export function ContactForm({ initialMessage = "" }: { initialMessage?: string }) {
  const [isContactSubmitted, setIsContactSubmitted] = useState(false);
  const [isContactSubmitSettled, setIsContactSubmitSettled] = useState(false);
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState("");
  const contactFormRef = useRef<HTMLFormElement | null>(null);
  const contactSubmitButtonRef = useRef<HTMLButtonElement | null>(null);

  function getField(formData: FormData, name: string) {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  }

  const handleContactSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setContactError("");
    setIsContactSubmitting(true);

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: getField(formData, "name"),
        email: getField(formData, "email"),
        project: getField(formData, "project"),
        message: getField(formData, "message"),
        budget: getField(formData, "budget"),
        timeline: getField(formData, "timeline"),
      }),
    });

    if (!response.ok) {
      setContactError("Something went sideways. Please email me directly.");
      setIsContactSubmitting(false);
      return;
    }

    const formRect = contactFormRef.current?.getBoundingClientRect();
    const buttonRect = contactSubmitButtonRef.current?.getBoundingClientRect();

    if (formRect && buttonRect) {
      contactFormRef.current?.style.setProperty(
        "--send-button-rise",
        `${Math.max(buttonRect.top - formRect.top, 0)}px`,
      );
    }

    setIsContactSubmitted(true);
    setIsContactSubmitting(false);
    setIsContactSubmitSettled(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsContactSubmitSettled(true);
      });
    });
  }, []);

  return (
    <div className="contact-layout">
      <div className="contact-copy">
        <h1>Start a project</h1>
        <p>
          Tell me what you need.
          <br />
          I&apos;ll get back to you.
        </p>
      </div>

      <form
        aria-live="polite"
        className={[
          "contact-form",
          isContactSubmitted ? "is-sent" : "",
          isContactSubmitSettled ? "is-settled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onSubmit={handleContactSubmit}
        ref={contactFormRef}
      >
        <label>
          <span>Name</span>
          <input name="name" type="text" autoComplete="name" />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" />
        </label>
        <label>
          <span>Project or company</span>
          <input name="project" type="text" />
        </label>
        <label className="contact-message">
          <span>What do you need?</span>
          <textarea name="message" rows={5} defaultValue={initialMessage} required />
        </label>
        <label>
          <span>Budget</span>
          <input name="budget" type="text" />
        </label>
        <label>
          <span>Desired timeline</span>
          <input name="timeline" type="text" />
        </label>
        <button
          disabled={isContactSubmitted || isContactSubmitting}
          ref={contactSubmitButtonRef}
          type="submit"
        >
          <span className="send-label send-label-default">
            {isContactSubmitting ? "Sending..." : "Send message"}
          </span>
          <span className="send-label send-label-sent">Message Sent</span>
        </button>
        {contactError ? <p className="contact-error">{contactError}</p> : null}
      </form>

      <a className="contact-email" href="mailto:will@pebblesprings.co">
        will@pebblesprings.co
      </a>
    </div>
  );
}

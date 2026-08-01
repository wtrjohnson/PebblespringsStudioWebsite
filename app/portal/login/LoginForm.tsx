"use client";

import { type FormEvent, useState } from "react";

export function PortalLoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/portal/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;

      setMessage(data?.message ?? "If that email has access, we sent a login link.");
      setStatus("sent");
    } catch {
      setMessage("If that email has access, we sent a login link.");
      setStatus("sent");
    }
  }

  return (
    <form className="portal-login-form" onSubmit={handleSubmit}>
      <label>
        <span>Email address</span>
        <input
          autoComplete="email"
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
      </label>
      <button disabled={status === "sending"} type="submit">
        {status === "sending" ? "Sending" : "Send login link"}
      </button>
      {message ? <p aria-live="polite">{message}</p> : null}
    </form>
  );
}

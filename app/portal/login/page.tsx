import { PortalLoginForm } from "./LoginForm.tsx";

export const dynamic = "force-dynamic";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="portal-page portal-login-page">
      <section className="portal-login-panel" aria-labelledby="portal-login-title">
        <a className="portal-brand" href="/" aria-label="Pebblesprings Studio home">
          <img src="/PSLogo.png" alt="" />
          <span>Client Portal</span>
        </a>

        <div>
          <p>Pebblesprings Studio</p>
          <h1 id="portal-login-title">Check your email to sign in.</h1>
        </div>

        {error ? (
          <p className="portal-login-error">
            That link is invalid or expired. Request a fresh login link below.
          </p>
        ) : null}

        <PortalLoginForm />
      </section>
    </main>
  );
}

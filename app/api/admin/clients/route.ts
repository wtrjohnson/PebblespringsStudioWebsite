import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { requireAdmin } from "../../../../db/adminAuth";
import { portalPhases } from "../../../../db/portalPhases";
import { portalClients, portalProjects, portalUsers } from "../../../../db/schema";

const PAYMENT_STATUSES = ["pending", "partial", "complete"] as const;
const USER_ROLES = ["approver", "viewer"] as const;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin(request))) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const raw = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    if (!raw) {
      return Response.json({ error: "body is required" }, { status: 400 });
    }

    const clientName = text(raw.clientName);
    const userName = text(raw.userName);
    const email = text(raw.email).toLowerCase();
    const projectName = text(raw.projectName);
    const slug = text(raw.slug);
    const siteUrl = normalizeUrl(text(raw.siteUrl));
    const projectStart = text(raw.projectStart) || null;
    const contractType = text(raw.contractType);
    const paymentStatus = text(raw.paymentStatus);
    const currentPhase = text(raw.currentPhase);
    const nextUp = text(raw.nextUp);
    const userRole = text(raw.userRole);
    const contractAmount = Number(raw.contractAmount);

    if (!clientName || !userName || !email || !projectName || !slug || !siteUrl) {
      return Response.json({ error: "Client, portal user, project, slug, and website URL are required." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Enter a valid portal user email." }, { status: 400 });
    }

    if (!/^https?:\/\//i.test(siteUrl)) {
      return Response.json({ error: "Website URL must begin with http:// or https://." }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return Response.json({ error: "Slug must use lowercase letters, numbers, and hyphens only." }, { status: 400 });
    }

    if (!Number.isInteger(contractAmount) || contractAmount < 0) {
      return Response.json({ error: "Contract amount must be a whole dollar amount." }, { status: 400 });
    }

    if (!portalPhases.includes(currentPhase)) {
      return Response.json({ error: "Phase is not one of the known phases." }, { status: 400 });
    }

    if (!PAYMENT_STATUSES.includes(paymentStatus as (typeof PAYMENT_STATUSES)[number])) {
      return Response.json({ error: "Payment status is invalid." }, { status: 400 });
    }

    if (!USER_ROLES.includes(userRole as (typeof USER_ROLES)[number])) {
      return Response.json({ error: "Portal user role is invalid." }, { status: 400 });
    }

    const db = await getDb();
    const [existingSlug, existingEmail] = await Promise.all([
      db.select({ id: portalProjects.id }).from(portalProjects).where(eq(portalProjects.slug, slug)).limit(1),
      db.select({ id: portalUsers.id }).from(portalUsers).where(eq(portalUsers.email, email)).limit(1),
    ]);

    if (existingSlug.length) {
      return Response.json({ error: "That portal slug is already in use." }, { status: 409 });
    }

    if (existingEmail.length) {
      return Response.json({ error: "That portal user email is already in use." }, { status: 409 });
    }

    let createdClientId: number | null = null;
    let result: {
      client: { id: number };
      user: { id: number };
      project: { id: number; slug: string };
    };

    try {
      const [client] = await db.insert(portalClients).values({ name: clientName }).returning({ id: portalClients.id });
      createdClientId = client.id;
      const [user] = await db.insert(portalUsers).values({
        clientId: client.id,
        email,
        name: userName,
        role: userRole as "approver" | "viewer",
      }).returning({ id: portalUsers.id });
      const [project] = await db.insert(portalProjects).values({
        clientId: client.id,
        clientName,
        projectName,
        slug,
        siteUrl,
        projectStart,
        contractAmount,
        contractType,
        paymentStatus: paymentStatus as (typeof PAYMENT_STATUSES)[number],
        currentPhase,
        nextUp,
        status: "active",
      }).returning({ id: portalProjects.id, slug: portalProjects.slug });

      result = { client, user, project };
    } catch (error) {
      if (createdClientId) {
        await db.delete(portalClients).where(eq(portalClients.id, createdClientId));
      }
      throw error;
    }

    return Response.json({ client: result.client, user: result.user, project: result.project }, { status: 201 });
  } catch (error) {
    console.error("Unable to create client onboarding record", error);
    return Response.json({ error: "Unable to create the client and project." }, { status: 500 });
  }
}

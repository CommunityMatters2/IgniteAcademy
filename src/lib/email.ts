import "server-only";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { IgniteEmail, type IgniteEmailProps } from "@/emails/ignite-email";
import { appUrl } from "@/lib/env";

/**
 * Render to HTML here instead of passing `react` to Resend: Resend loads its renderer with a
 * dynamic import that is missing from the deployed bundle, so `react:` emails fail on Vercel.
 */
async function renderEmail(props: Omit<IgniteEmailProps, "appUrl">) {
  const element = IgniteEmail({ ...props, appUrl: appUrl() } as IgniteEmailProps);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text };
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Until a domain is verified in Resend, only `onboarding@resend.dev` works as the sender,
 * and it can only deliver to the Resend account owner's address.
 */
const FROM = process.env.EMAIL_FROM ?? "IGNITE Academy <onboarding@resend.dev>";

type SendArgs = Omit<IgniteEmailProps, "appUrl"> & { to: string | string[]; subject: string };

export async function sendEmail({ to, subject, ...props }: SendArgs) {
  if (!resend) {
    console.info(`[email:dev] to=${String(to)} subject="${subject}" cta=${props.cta?.href ?? "-"}`);
    return { ok: true as const, dev: true };
  }
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    ...(await renderEmail(props)),
  });
  if (error) {
    console.error("[email] send failed", error);
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

/** Sends the same message to many people individually (Resend batch API, 100 per call). */
export async function sendEmailToMany(recipients: string[], args: Omit<SendArgs, "to">) {
  const { subject, ...props } = args;
  if (!resend) {
    console.info(`[email:dev] batch x${recipients.length} subject="${subject}"`);
    return { ok: true as const, sent: recipients.length };
  }
  const body = await renderEmail(props);
  let sent = 0;
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const { error } = await resend.batch.send(chunk.map((to) => ({ from: FROM, to, subject, ...body })));
    if (error) console.error("[email] batch failed", error);
    else sent += chunk.length;
  }
  return { ok: true as const, sent };
}

/** Fire-and-forget variant that never throws (used for non-critical notifications). */
export async function trySendEmail(args: SendArgs) {
  try {
    await sendEmail(args);
  } catch (err) {
    console.error("[email] unexpected error", err);
  }
}

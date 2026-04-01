/**
 * Transactional email via Resend.
 * Set RESEND_API_KEY and EMAIL_FROM in .env.local to enable.
 * When not configured, emails are silently skipped (dev-friendly).
 */

const FROM = process.env.EMAIL_FROM ?? "Where Should I Move <notifications@whereshouldimove.us>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010";

// Lazy-initialise Resend only when the key is present, so builds/tests
// don't fail in environments without the key.
async function getResend() {
	if (!process.env.RESEND_API_KEY) return null;
	const { Resend } = await import("resend");
	return new Resend(process.env.RESEND_API_KEY);
}

async function send(options: { to: string; subject: string; html: string }) {
	const resend = await getResend();
	if (!resend) return; // silently skip when unconfigured
	try {
		await resend.emails.send({ from: FROM, ...options });
	} catch (err) {
		console.error("[email] send failed:", err);
	}
}

// ── Email templates ──────────────────────────────────────────────────────────

function baseHtml(body: string) {
	return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e0e0e0}
  .wrap{max-width:560px;margin:40px auto;padding:0 20px}
  .card{background:#111;border:1px solid #222;border-radius:16px;padding:32px}
  .brand{font-size:20px;font-weight:700;margin-bottom:24px}
  .brand span{color:#00d4ff}
  h1{font-size:22px;font-weight:700;margin:0 0 12px}
  p{font-size:15px;line-height:1.6;color:#aaa;margin:0 0 16px}
  .btn{display:inline-block;background:#00d4ff;color:#000;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;margin:8px 0}
  .divider{border:none;border-top:1px solid #222;margin:24px 0}
  .footer{font-size:12px;color:#555;margin-top:24px;text-align:center}
</style></head><body>
<div class="wrap"><div class="card">
  <div class="brand"><span>Next</span>Home USA</div>
  ${body}
</div>
<div class="footer">Where Should I Move · <a href="${APP_URL}/dashboard" style="color:#555">Manage account</a></div>
</div></body></html>`;
}

// Welcome email after sign-up
export async function sendWelcomeEmail(to: string, name: string) {
	await send({
		to,
		subject: "Welcome to Where Should I Move 🏠",
		html: baseHtml(`
			<h1>Welcome, ${name ?? "explorer"}!</h1>
			<p>You're all set to start your relocation research. Explore 1,000+ US cities, take our AI quiz for personalized matches, and save cities to your Move Plan.</p>
			<a class="btn" href="${APP_URL}/explore">Start Exploring</a>
			<hr class="divider">
			<p>Not sure where to begin? Take the <a href="${APP_URL}/quiz" style="color:#00d4ff">AI Quiz</a> — it takes 2 minutes and gives you a personalized city ranking.</p>
		`),
	});
}

// Subscription confirmation
export async function sendSubscriptionConfirmedEmail(to: string, name: string, planLabel: string) {
	await send({
		to,
		subject: "You're now a Where Should I Move Premium member ✨",
		html: baseHtml(`
			<h1>Premium unlocked!</h1>
			<p>Thanks for subscribing to <strong>${planLabel}</strong>. You now have access to:</p>
			<ul style="color:#aaa;font-size:15px;line-height:2;padding-left:20px">
				<li>Unlimited city saves</li>
				<li>PDF relocation reports</li>
				<li>AI-powered "Surprise Me" recommendations</li>
				<li>Full 43-filter explore access</li>
			</ul>
			<a class="btn" href="${APP_URL}/explore">Explore as Premium</a>
			<hr class="divider">
			<p>Manage your subscription anytime from your <a href="${APP_URL}/dashboard" style="color:#00d4ff">dashboard</a>.</p>
		`),
	});
}

// Payment failed
export async function sendPaymentFailedEmail(to: string, name: string) {
	await send({
		to,
		subject: "Action needed: Payment failed for Where Should I Move Premium",
		html: baseHtml(`
			<h1>We couldn't process your payment</h1>
			<p>Hi ${name ?? "there"}, your most recent Premium subscription payment didn't go through. Your account has been downgraded to the free plan.</p>
			<a class="btn" href="${APP_URL}/upgrade">Resubscribe</a>
			<hr class="divider">
			<p>To update your payment method, visit your <a href="${APP_URL}/dashboard" style="color:#00d4ff">billing dashboard</a>. If you need help, reply to this email.</p>
		`),
	});
}

// Subscription cancelled
export async function sendSubscriptionCancelledEmail(to: string, name: string, endsAt: string) {
	await send({
		to,
		subject: "Your Where Should I Move Premium subscription has been cancelled",
		html: baseHtml(`
			<h1>Subscription cancelled</h1>
			<p>Hi ${name ?? "there"}, your Premium subscription has been cancelled. You'll retain Premium access until <strong>${endsAt}</strong>.</p>
			<p>After that, your account will revert to the free plan. Your saved cities and search history will be preserved.</p>
			<a class="btn" href="${APP_URL}/upgrade">Resubscribe anytime</a>
		`),
	});
}

// Review approved notification
export async function sendReviewApprovedEmail(to: string, cityName: string, citySlug: string) {
	await send({
		to,
		subject: `Your review of ${cityName} is live!`,
		html: baseHtml(`
			<h1>Your review is published</h1>
			<p>Your review of <strong>${cityName}</strong> has been approved and is now live for other movers to read. Thanks for contributing to the WhereShouldIMove community!</p>
			<a class="btn" href="${APP_URL}/city/${citySlug}">View your review</a>
		`),
	});
}

// Weekly search alert
export async function sendWeeklyAlertEmail(
	to: string,
	name: string,
	searchName: string,
	cities: Array<{ name: string; stateId: string; slug: string; score: number }>,
	exploreUrl: string,
	dashboardUrl: string,
) {
	const cityRows = cities
		.map(
			(c, i) => `
		<tr>
			<td style="padding:10px 8px;border-bottom:1px solid #1e1e1e;color:#aaa;text-align:center;width:32px">${i + 1}</td>
			<td style="padding:10px 8px;border-bottom:1px solid #1e1e1e">
				<a href="${APP_URL}/city/${c.slug}" style="color:#e0e0e0;text-decoration:none;font-weight:600">${c.name}</a>
				<span style="color:#666;font-size:13px">, ${c.stateId}</span>
			</td>
			<td style="padding:10px 8px;border-bottom:1px solid #1e1e1e;text-align:right">
				<span style="color:${c.score >= 70 ? "#00d4ff" : c.score >= 50 ? "#f59e0b" : "#f87171"};font-weight:700">${c.score}</span>
			</td>
		</tr>`,
		)
		.join("");

	await send({
		to,
		subject: `Your weekly city matches are ready — "${searchName}"`,
		html: baseHtml(`
			<h1>Your weekly city matches</h1>
			<p>Hi ${name ?? "there"}, here are the top cities matching your saved search <strong>"${searchName}"</strong>:</p>
			<table style="width:100%;border-collapse:collapse;margin:16px 0">
				<thead>
					<tr>
						<th style="text-align:center;padding:8px;border-bottom:1px solid #333;color:#555;font-size:12px">#</th>
						<th style="text-align:left;padding:8px;border-bottom:1px solid #333;color:#555;font-size:12px">City</th>
						<th style="text-align:right;padding:8px;border-bottom:1px solid #333;color:#555;font-size:12px">Score</th>
					</tr>
				</thead>
				<tbody>${cityRows}</tbody>
			</table>
			<a class="btn" href="${exploreUrl}">See all matches</a>
			<hr class="divider">
			<p style="font-size:13px">To stop receiving these alerts, <a href="${dashboardUrl}" style="color:#00d4ff">manage your saved searches</a> in your dashboard.</p>
		`),
	});
}

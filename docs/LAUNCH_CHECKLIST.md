# Production Launch Checklist — GOES Portal

Pre-launch security + compliance items for when portal.goeseducation.com
goes live handling real student passport / DNI / academic records.

Target audience: future-you at deploy time. Work top-down; each section gates
the next.

---

## 0. Context

- Handles: passport scans, DNI, academic transcripts, personal essays
- Users: Spanish / EU students → **GDPR applies**
- Auth: Supabase (email/password + JWT)
- Storage: Supabase Storage, private bucket `documents`
- Host: Vercel, CNAME from Hostinger DNS

---

## 1. Must fix BEFORE first real student

### 1.1 Rotate Supabase anon key
Current key was pasted into a Claude session — treat as leaked.
- Supabase dashboard → Settings → API → roll anon key
- Update Vercel env var `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Redeploy

### 1.2 Separate prod Supabase project
Dev project contains test rows + auditor history.
- New project, region **West EU (Ireland)** or **Central EU (Frankfurt)** — required for GDPR data residency
- Re-run all migrations in order: `0001` → `0013`
- New env vars in Vercel point to prod URL + anon key
- Keep dev project for staging

### 1.3 Legal: Privacy Policy + Terms of Service + consent checkbox
Without these, processing passport data in the EU is illegal.
- Draft privacy policy (data collected, purpose, retention period, third parties, user rights)
- Draft ToS
- Add checkbox to `/signup`: "Acepto la [Política de privacidad] y los [Términos de servicio]" — required, block submit if unchecked
- Store consent timestamp in `profiles.consent_at`

### 1.4 Custom SMTP
Supabase default SMTP is rate-limited and not production-grade.
- Sign up for Resend (free tier 3k/mo) or SendGrid
- Supabase dashboard → Auth → Email Templates → SMTP Settings → configure custom
- Use a subdomain like `noreply@goeseducation.com`
- Set SPF, DKIM, DMARC records in Hostinger DNS

### 1.5 Virus scan on uploads
Student uploads malicious PDF → advisor downloads → infected.
- Option A: Supabase Edge Function triggered on `documents` insert, POST file to ClamAV service, reject if positive
- Option B: Cloud scanner (VirusTotal, Bitdefender Cloud) via same pattern
- Quarantine bucket for flagged files; notify advisor team

---

## 2. High priority — before heavy use

### 2.1 Error monitoring
- Sentry free tier (5k events/mo)
- Install `@sentry/nextjs`, wrap in `instrumentation.ts`
- Replace `console.error` in `src/lib/errors.ts` with `Sentry.captureException`

### 2.2 Supabase hardening
- Dashboard → Settings → General → **enable PITR backups** (paid plan)
- Dashboard account → enable 2FA on your login
- Export migrations + schema backup to off-site (GitHub already covers migrations)

### 2.3 MFA for advisors
Admin role sees all families' passports.
- Enable TOTP: Dashboard → Auth → Providers → enable MFA
- Add UI in advisor settings to enroll
- Middleware: block `/admin/*` for internal users without MFA enrolled

### 2.4 GDPR right-to-erasure workflow
- Admin UI: "Eliminar estudiante" button on `/admin/[familyId]`
- Server action: `delete from families where id = ?` (cascade covers checklist/docs/comments/activity_log)
- Separately: `supabase.storage.from('documents').remove(await listAllUnderFolder(familyId))`
- Log deletion in a separate `deletion_log` table (out-of-scope of cascaded delete) for accountability

### 2.5 HSTS + HTTPS verification
- Vercel auto-provisions Let's Encrypt cert for CNAMEd subdomain
- Add HSTS header via `next.config.ts`:
  ```ts
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ]
    }]
  }
  ```
- Submit to HSTS preload list (optional but recommended)

---

## 3. Embed strategy (Hostinger site → portal)

### 3.1 Prefer link-out over iframe
```html
<a href="https://portal.goeseducation.com" class="btn">Acceder al portal</a>
```
- No cookie/auth complications
- No clickjacking risk
- No mixed-content issues

### 3.2 If you MUST iframe
- Set `X-Frame-Options: SAMEORIGIN` at portal (blocks embed entirely from cross-origin)
- OR use CSP `frame-ancestors https://goeseducation.com` to allow only your marketing site
- Expect auth cookie issues in Safari (third-party cookie blocking)

### 3.3 CORS lockdown
- Supabase dashboard → Settings → API → **Additional allowed origins**
- Add `https://portal.goeseducation.com` + `http://localhost:3000` (dev)
- Remove `*` wildcard

---

## 4. Medium priority — post-launch, within 30 days

### 4.1 Auth rate limits
- Supabase dashboard → Auth → Rate Limits → verify signup/login caps are on
- Consider Cloudflare Turnstile (free) on signup to block bot accounts

### 4.2 Session TTL
- Default refresh token = 30 days. Tighten to 7 for passport-access roles
- Dashboard → Auth → Sessions → Refresh token lifetime

### 4.3 Password policy
- Dashboard → Auth → Providers → Email
- Min length 12, require uppercase + number

### 4.4 Activity log integrity
- `activity_log` is RLS-protected but advisors w/ DB access can tamper
- Export daily to append-only bucket (S3 with Object Lock) via pg_cron + Edge Function
- Optional unless SOC2/ISO needed

### 4.5 Monitoring dashboards
- Supabase paid tier = query logs + slow query detection
- Set alerts: failed login spike, rate-limit trigger spike, 5xx rate

---

## 5. Long-tail — plan, not block

- **Third-party pen test** before scaling past ~50 students
- **DPA** (Data Processing Agreement) signed with Supabase — they offer one via dashboard
- **SOC2 / ISO 27001** docs if selling to schools as B2B
- **Cyber insurance** — breach cost is usually ~€100-500 per affected record under GDPR
- **Incident response plan** — who calls who, what to tell students, deadline to notify regulator (72 hours under GDPR)

---

## 6. Smoke test before flipping DNS

After deploying prod, run through this on `portal.goeseducation.com`:

- [ ] `https://` loads, no cert warnings
- [ ] `curl -I https://portal.goeseducation.com` returns `Strict-Transport-Security` header
- [ ] Signup → receives confirm email from `noreply@goeseducation.com` (not `@supabase.co`)
- [ ] Consent checkbox blocks signup if unchecked
- [ ] Onboarding seeds checklist successfully
- [ ] Upload 50MB PDF → succeeds; scan service receives hash
- [ ] Upload 60MB file → blocked client-side + server-side
- [ ] Try `curl -X PATCH` on profiles with `role=admin` as a logged-in student → blocked by 0011 trigger
- [ ] Try uploading 25 docs in 60s → 21st blocked by 0012 rate limit
- [ ] Advisor logs in → sees only that advisor's families (if multi-advisor later)
- [ ] `/admin` protected from non-advisor access
- [ ] Delete test student via admin button → FK cascades + storage folder emptied
- [ ] Sentry receives test error (throw in error.tsx)
- [ ] GDPR data export — can produce JSON of all student's data on request

---

## 7. Ongoing ops hygiene

- Review `activity_log` weekly for anomalies
- Rotate anon key every 6 months
- Review dependencies: `npm audit` monthly; bump Next.js / React on security advisories
- Re-run `npm run check` (lint + typecheck + knip) in CI before every deploy
- Quarterly: audit RLS policies, verify no new table added without `enable row level security`

---

**Last updated:** 2026-04-23 (initial draft)

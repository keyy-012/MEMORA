MEMORA HOME V1

Files
- index.html      : Full-screen premium animated heart home
- netlify.toml    : Baseline security headers for Netlify

How to test
1. Put both files at the root of your Netlify site folder/repository.
2. Deploy.
3. Open the site.

What V1 already has
- Full-screen heart experience
- Hamburger menu at top-left
- TH / EN switch at top-right
- Translation structure designed to add more languages later
- Short Memora description
- Explore Gifts CTA
- Smooth menu / language / click / page-transition effects
- Mobile-responsive layout
- prefers-reduced-motion accessibility
- Baseline Netlify security headers

SECURITY RULES FOR MEMORA
1. Never put Supabase service_role keys, email API secrets, bank/payment secrets, admin passwords,
   or any private credentials in index.html or browser JavaScript.
2. Frontend code can always be inspected by a visitor. Treat frontend code as public.
3. Payment verification, order approval, site creation, edit-token issuance, email sending,
   and privileged database writes must happen on trusted server-side code only.
4. Use random expiring edit tokens/session tokens, not predictable site IDs.
5. Enforce Supabase Row Level Security (RLS); do not trust the browser to decide permissions.
6. Admin routes need real authentication and server-side authorization.
7. Validate and limit uploaded files server-side: content type, size, extension, ownership.
8. Add rate limits to order/slip/login/admin/API endpoints.
9. Log security-sensitive events: failed logins, approvals, token creation, suspicious traffic.
10. Keep dependencies updated and secrets only in environment variables.

ABOUT CODE COPYING
No public website can completely hide its HTML/CSS/JS from someone who can load it in a browser.
The right protection is architectural:
- Keep valuable business logic on the server.
- Keep secrets on the server.
- Require valid signed/authorized requests for privileged actions.
- Minify/bundle frontend code only as an extra friction layer, not as security.

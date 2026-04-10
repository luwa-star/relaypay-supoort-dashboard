// Auth is now handled entirely by Supabase.
// See lib/supabase-server.ts for the server-side client used in route handlers,
// and middleware.ts for session validation and refresh on every request.
//
// To add or invite users:
//   Supabase Dashboard → Authentication → Users → "Invite user"
//   or use supabase.auth.admin.inviteUserByEmail() from a service-role client.

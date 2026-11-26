export const pendingInviteCookie = "shared_margins_invite";

export function normalizeInviteCode(value: unknown) {
  if (typeof value !== "string" || !value || value.length > 128) return undefined;
  const code = value.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z2-7]{16,64}$/.test(code) ? code : undefined;
}

export function invitePath(code?: string) {
  return code ? `/convite?codigo=${encodeURIComponent(code)}` : "/convite";
}

export function signInPath(status?: "failed" | "unavailable", code?: string) {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (code) query.set("codigo", code);
  return query.size ? `/entrar?${query}` : "/entrar";
}

export const pendingInviteOptions = { path: "/auth", httpOnly: true, sameSite: "lax", maxAge: 600 } as const;

export function homeInvitePath(code: string) {
  return `/?invite=${encodeURIComponent(code)}`;
}

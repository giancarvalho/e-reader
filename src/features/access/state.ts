export type InviteError = "invalid_code" | "rate_limited" | "unavailable";

export type InviteState = { error?: InviteError };

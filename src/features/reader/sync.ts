"use server";

import { getVerifiedReaderClient } from "@/lib/supabase/server";
import type { ReaderIdentity } from "@/lib/books/local";
import type { ReaderPreferences, ReaderState, ReadingPosition } from "@/lib/reader/model";

type Changes = { position?: ReadingPosition; preferences?: ReaderPreferences };

export async function syncReaderState(identity: ReaderIdentity, changes: Changes): Promise<ReaderState | null> {
  const client = await getVerifiedReaderClient(identity);
  if (!client) return null;
  const context = { client, identity };
  const [position, preferences] = await Promise.all([
    syncPosition(context, changes.position),
    syncPreferences(context, changes.preferences),
  ]);
  return { position, preferences };
}

type Context = {
  client: NonNullable<Awaited<ReturnType<typeof getVerifiedReaderClient>>>;
  identity: ReaderIdentity;
};

async function syncPosition({ client, identity }: Context, value?: ReadingPosition) {
  const fields = "cfi,fraction,updated_at";
  const query = client.from("progress");
  const row = { user_id: identity.user, group_id: identity.group, book_id: identity.hash };
  const result = value
    ? await query.upsert({ ...row, cfi: value.cfi, fraction: value.fraction }).select(fields).maybeSingle()
    : await query.select(fields).match(row).maybeSingle();
  if (!result.data) return undefined;
  return {
    value: { cfi: result.data.cfi as string, fraction: result.data.fraction as number },
    pending: null,
    updatedAt: result.data.updated_at as string,
  };
}

async function syncPreferences({ client, identity }: Context, value?: ReaderPreferences) {
  const fields = "theme,custom_bg,custom_ink,font_size,font_family,updated_at";
  const query = client.from("user_preferences");
  const result = value
    ? await query.upsert({
        user_id: identity.user, theme: value.theme, custom_bg: value.background, custom_ink: value.ink,
        font_size: value.size, font_family: value.font,
      }).select(fields).maybeSingle()
    : await query.select(fields).eq("user_id", identity.user).maybeSingle();
  if (!result.data) return undefined;
  const valueFromServer: ReaderPreferences = {
    theme: result.data.theme, background: result.data.custom_bg, ink: result.data.custom_ink,
    size: result.data.font_size, font: result.data.font_family,
  };
  return { value: valueFromServer, pending: null, updatedAt: result.data.updated_at as string };
}

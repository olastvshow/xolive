import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GAME_KEYS } from "@/games/logic";

const FRESH_MS = 45_000;
const INVITE_TTL_MS = 45_000;

function code6() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** Say "I'm here and open to a game", and get everyone else who is. */
export const lobbyPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ available: z.boolean().default(true) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    await supabaseAdmin.from("lobby_presence").upsert({
      user_id: context.userId,
      available: data.available,
      last_seen_at: now,
      updated_at: now,
    }, { onConflict: "user_id" });

    const since = new Date(Date.now() - FRESH_MS).toISOString();
    const { data: rows } = await supabaseAdmin
      .from("lobby_presence")
      .select("user_id, last_seen_at")
      .eq("available", true)
      .gte("last_seen_at", since)
      .neq("user_id", context.userId)
      .limit(40);

    const ids = (rows ?? []).map((r) => r.user_id);
    if (!ids.length) return [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids);
    return profiles ?? [];
  });

export const invitePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    toUserId: z.string().uuid(),
    gameKey: z.enum(GAME_KEYS),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.toUserId === context.userId) throw new Error("You can't invite yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: room, error } = await supabaseAdmin.from("rooms").insert({
      kind: "match",
      code: code6(),
      host_id: context.userId,
      status: "waiting",
      last_active_at: new Date().toISOString(),
    }).select("*").single();
    if (error) throw new Error(error.message);

    const { data: invite, error: iErr } = await supabaseAdmin.from("match_invites").insert({
      from_user: context.userId,
      to_user: data.toUserId,
      room_id: room.id,
      game_key: data.gameKey,
      status: "pending",
      expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    }).select("*").single();
    if (iErr) throw new Error(iErr.message);

    return { roomId: room.id, inviteId: invite.id };
  });

export const myInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("match_invites")
      .select("*")
      .eq("to_user", context.userId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    if (!rows?.length) return [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", rows.map((r) => r.from_user));
    return rows.map((r) => ({
      ...r,
      from: (profiles ?? []).find((p) => p.id === r.from_user) ?? null,
    }));
  });

export const inviteStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ inviteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("match_invites")
      .select("*").eq("id", data.inviteId).maybeSingle();
    if (!row) return null;
    if (row.from_user !== context.userId && row.to_user !== context.userId) throw new Error("Not your invite");
    return row;
  });

export const respondInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ inviteId: z.string().uuid(), accept: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin.from("match_invites")
      .select("*").eq("id", data.inviteId).maybeSingle();
    if (!invite) throw new Error("That invite is gone");
    if (invite.to_user !== context.userId) throw new Error("Not your invite");
    if (invite.status !== "pending") throw new Error("That invite was already answered");
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("That invite expired");

    await supabaseAdmin.from("match_invites")
      .update({ status: data.accept ? "accepted" : "declined" })
      .eq("id", invite.id);

    if (!data.accept) {
      await supabaseAdmin.from("rooms").update({ status: "ended" }).eq("id", invite.room_id);
      return { roomId: null };
    }

    await supabaseAdmin.from("rooms").update({
      guest_id: context.userId,
      status: "active",
      last_active_at: new Date().toISOString(),
    }).eq("id", invite.room_id);
    return { roomId: invite.room_id };
  });

export const cancelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ inviteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin.from("match_invites")
      .select("*").eq("id", data.inviteId).maybeSingle();
    if (!invite || invite.from_user !== context.userId) throw new Error("Not your invite");
    await supabaseAdmin.from("match_invites").update({ status: "cancelled" }).eq("id", invite.id);
    await supabaseAdmin.from("rooms").update({ status: "ended" }).eq("id", invite.room_id);
    return { ok: true };
  });

export const createCodeRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room, error } = await supabaseAdmin.from("rooms").insert({
      kind: "match",
      code: code6(),
      host_id: context.userId,
      status: "waiting",
      last_active_at: new Date().toISOString(),
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { roomId: room.id, code: room.code };
  });

export const joinByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    code: z.string().trim().toUpperCase().length(6),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room } = await supabaseAdmin.from("rooms")
      .select("*")
      .eq("kind", "match")
      .eq("code", data.code)
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!room) throw new Error("No open room with that code");
    if (room.host_id === context.userId) return { roomId: room.id };
    if (room.guest_id && room.guest_id !== context.userId) throw new Error("That room is full");

    await supabaseAdmin.from("rooms").update({
      guest_id: context.userId,
      status: "active",
      last_active_at: new Date().toISOString(),
    }).eq("id", room.id);
    return { roomId: room.id };
  });

export const getMatchRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roomId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room } = await supabaseAdmin.from("rooms")
      .select("*").eq("id", data.roomId).maybeSingle();
    if (!room) throw new Error("Room not found");
    if (room.host_id !== context.userId && room.guest_id !== context.userId) throw new Error("Not your room");

    const ids = [room.host_id, room.guest_id].filter((x): x is string => Boolean(x));
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id, username, display_name, avatar_url").in("id", ids);

    const me = (profiles ?? []).find((p) => p.id === context.userId) ?? null;
    const partner = (profiles ?? []).find((p) => p.id !== context.userId) ?? null;
    return { room, me, partner, isHost: room.host_id === context.userId };
  });

export const leaveMatchRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roomId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room } = await supabaseAdmin.from("rooms")
      .select("*").eq("id", data.roomId).maybeSingle();
    if (!room) return { ok: true };
    if (room.host_id !== context.userId && room.guest_id !== context.userId) throw new Error("Not your room");
    await supabaseAdmin.from("game_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("room_id", room.id).in("status", ["proposed", "active"]);
    await supabaseAdmin.from("rooms").update({ status: "ended" }).eq("id", room.id);
    return { ok: true };
  });

export type LeaderRow = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  wins: number;
  played: number;
};

/** Top players by finished-game wins across every game. */
export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<LeaderRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rpc = supabaseAdmin as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: LeaderRow[] | null; error: { message: string } | null }>;
    };
    const { data, error } = await rpc.rpc("leaderboard_top", { limit_n: 25 });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({ ...r, wins: Number(r.wins), played: Number(r.played) }));
  });

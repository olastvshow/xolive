import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  applyAction, gmInit, xoInit, glassInit, hockeyInit,
  GAME_KEYS, type GmQuestion, type Meta,
} from "@/games/logic";

const GRACE_DAYS = 30;

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ===================== profile =====================

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles").select("*").eq("id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
    display_name: z.string().trim().min(1).max(32).optional(),
    avatar_url: z.string().url().max(1000).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const updates: { username?: string; display_name?: string; avatar_url?: string | null } = {};
    if (data.username !== undefined) updates.username = data.username;
    if (data.display_name !== undefined) updates.display_name = data.display_name;
    if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url;
    if (!Object.keys(updates).length) return { ok: true };
    const { error } = await supabaseAdmin.from("profiles").update(updates).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const heartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles")
      .update({ last_seen_at: new Date().toISOString() }).eq("id", context.userId);
    return { ok: true };
  });

// ===================== pairing =====================

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function livePairFor(admin: Admin, userId: string) {
  const { data } = await admin
    .from("pair_members")
    .select("pair_id, pairs!inner(id, status, created_at)")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  return data ? (data.pairs as unknown as { id: string; status: string; created_at: string }) : null;
}

async function ensureRoom(admin: Admin, pairId: string, hostId: string) {
  const { data: existing } = await admin.from("rooms").select("*").eq("pair_id", pairId).maybeSingle();
  if (existing) return existing;
  const { data, error } = await admin
    .from("rooms").insert({ pair_id: pairId, host_id: hostId }).select("*").single();
  if (error) throw new Error(error.message);
  await admin.from("pair_stats").upsert({ pair_id: pairId }, { onConflict: "pair_id" });
  return data;
}

export const getPairState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = (await supabaseAdmin.from("profiles").select("*").eq("id", context.userId).maybeSingle()).data;
    const pair = await livePairFor(supabaseAdmin, context.userId);
    if (!pair) return { pair: null, me, partner: null, room: null, invite: null, stats: null };

    const { data: members } = await supabaseAdmin
      .from("pair_members").select("user_id").eq("pair_id", pair.id).eq("active", true);
    const partnerId = (members ?? []).map((m) => m.user_id).find((id) => id !== context.userId) ?? null;
    const partner = partnerId
      ? (await supabaseAdmin.from("profiles")
          .select("id, username, display_name, avatar_url, last_seen_at").eq("id", partnerId).maybeSingle()).data
      : null;

    let invite: { code: string; expires_at: string } | null = null;
    if (!partnerId) {
      const { data: inv } = await supabaseAdmin
        .from("pair_invites").select("code, expires_at")
        .eq("pair_id", pair.id).is("redeemed_by", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      invite = inv ?? null;
    }

    const room = partnerId ? await ensureRoom(supabaseAdmin, pair.id, context.userId) : null;
    const stats = room
      ? (await supabaseAdmin.from("pair_stats").select("*").eq("pair_id", pair.id).maybeSingle()).data
      : null;

    return { pair, me, partner, room, invite, stats };
  });

export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let pair = await livePairFor(supabaseAdmin, context.userId);
    if (!pair) {
      const { data: created, error } = await supabaseAdmin
        .from("pairs").insert({ status: "pending" }).select("*").single();
      if (error) throw new Error(error.message);
      const { error: mErr } = await supabaseAdmin
        .from("pair_members").insert({ pair_id: created.id, user_id: context.userId, role: "owner" });
      if (mErr) throw new Error(mErr.message);
      pair = created;
    }
    if (pair.status === "active") throw new Error("You are already paired");

    for (let i = 0; i < 6; i++) {
      const code = genCode();
      const { data, error } = await supabaseAdmin.from("pair_invites")
        .insert({ code, pair_id: pair.id, created_by: context.userId })
        .select("code, expires_at").single();
      if (!error) return data;
      if (!error.message.includes("duplicate")) throw new Error(error.message);
    }
    throw new Error("Could not create a code, try again");
  });

export const redeemInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().length(6) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.toUpperCase();

    const mine = await livePairFor(supabaseAdmin, context.userId);
    // Already in a live pair: don't blow up, just send them to their room.
    if (mine?.status === "active") return { ok: true, pair_id: mine.id, already: true };

    const { data: invite } = await supabaseAdmin
      .from("pair_invites").select("*").eq("code", code).maybeSingle();
    if (!invite) throw new Error("That code doesn't exist");
    if (invite.redeemed_by) throw new Error("That code was already used");
    if (new Date(invite.expires_at) < new Date()) throw new Error("That code has expired");
    if (invite.created_by === context.userId) throw new Error("That's your own code");

    // leave any pending pair of my own first
    if (mine && mine.id !== invite.pair_id) {
      await supabaseAdmin.from("pair_members")
        .update({ active: false }).eq("pair_id", mine.id).eq("user_id", context.userId);
      await supabaseAdmin.from("pairs").update({ status: "unpaired" }).eq("id", mine.id);
    }

    const { error: mErr } = await supabaseAdmin
      .from("pair_members").insert({ pair_id: invite.pair_id, user_id: context.userId });
    if (mErr) throw new Error(mErr.message.includes("duplicate") ? "You're already in this pair" : mErr.message);

    await supabaseAdmin.from("pairs").update({ status: "active" }).eq("id", invite.pair_id);
    await supabaseAdmin.from("pair_invites")
      .update({ redeemed_by: context.userId, redeemed_at: new Date().toISOString() }).eq("code", code);
    await ensureRoom(supabaseAdmin, invite.pair_id, invite.created_by);
    return { ok: true, pair_id: invite.pair_id, already: false };
  });

export const unpair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pair = await livePairFor(supabaseAdmin, context.userId);
    if (!pair) return { ok: true };
    await supabaseAdmin.from("pair_members").update({ active: false }).eq("pair_id", pair.id);
    await supabaseAdmin.from("pairs")
      .update({ status: "unpaired", unpaired_at: new Date().toISOString() }).eq("id", pair.id);
    return { ok: true };
  });

// ===================== room =====================

async function requireRoom(admin: Admin, userId: string, roomId: string) {
  const { data: room } = await admin.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room) throw new Error("Room not found");

  if (room.pair_id) {
    const { data: members } = await admin.from("pair_members")
      .select("user_id").eq("pair_id", room.pair_id).eq("active", true);
    const ids = (members ?? []).map((m) => m.user_id);
    if (!ids.includes(userId)) throw new Error("Not your room");
    return { room, players: ids };
  }

  const ids = [room.host_id, room.guest_id].filter((x): x is string => Boolean(x));
  if (!ids.includes(userId)) throw new Error("Not your room");
  return { room, players: ids };
}


export const getComments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roomId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requireRoom(supabaseAdmin, context.userId, data.roomId);
    const { data: rows } = await supabaseAdmin.from("messages")
      .select("*").eq("room_id", data.roomId).order("created_at", { ascending: false }).limit(20);
    return (rows ?? []).reverse();
  });

export const sendComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    roomId: z.string().uuid(),
    text: z.string().trim().min(1).max(140),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requireRoom(supabaseAdmin, context.userId, data.roomId);
    const { data: row, error } = await supabaseAdmin.from("messages")
      .insert({ room_id: data.roomId, user_id: context.userId, text: data.text })
      .select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

// ===================== games =====================

export const getGames = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("games")
      .select("*").eq("active", true).order("sort_order");
    return data ?? [];
  });

export const getSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roomId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requireRoom(supabaseAdmin, context.userId, data.roomId);
    const { data: rows } = await supabaseAdmin.from("game_sessions")
      .select("*").eq("room_id", data.roomId).in("status", ["proposed", "active"])
      .order("created_at", { ascending: false }).limit(1);
    return rows?.[0] ?? null;
  });

async function buildInitialState(admin: Admin, gameKey: string, players: string[], subjectFirst: string) {
  if (gameKey === "xo") return xoInit(players);
  if (gameKey === "guess-me") {
    const { data: bank } = await admin.from("guess_me_questions").select("*").eq("active", true);
    const pool = [...(bank ?? [])].sort(() => Math.random() - 0.5).slice(0, 10);
    const other = players.find((p) => p !== subjectFirst) ?? players[0];
    const questions: GmQuestion[] = pool.map((q, i) => ({
      category: q.category,
      prompt: q.prompt,
      options: q.options,
      subject: i % 2 === 0 ? subjectFirst : other,
    }));
    return gmInit(questions);
  }
  if (gameKey === "fill-glass") return glassInit(players, subjectFirst);
  if (gameKey === "air-hockey") return hockeyInit(players, 7);
  throw new Error("Unknown game");
}

export const proposeGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    roomId: z.string().uuid(),
    gameKey: z.enum(GAME_KEYS),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { players } = await requireRoom(supabaseAdmin, context.userId, data.roomId);
    if (players.length < 2) throw new Error("Your partner isn't here yet");

    await supabaseAdmin.from("game_sessions")
      .update({ status: "declined", ended_at: new Date().toISOString() })
      .eq("room_id", data.roomId).in("status", ["proposed", "active"]);

    const state = await buildInitialState(supabaseAdmin, data.gameKey, players, context.userId);
    const { data: row, error } = await supabaseAdmin.from("game_sessions").insert({
      room_id: data.roomId,
      game_key: data.gameKey,
      status: "proposed",
      proposed_by: context.userId,
      players,
      state: state as never,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const respondProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    sessionId: z.string().uuid(),
    accept: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin.from("game_sessions")
      .select("*").eq("id", data.sessionId).maybeSingle();
    if (!session) throw new Error("That game is gone");
    await requireRoom(supabaseAdmin, context.userId, session.room_id);
    if (session.status !== "proposed") return session;

    const { data: row, error } = await supabaseAdmin.from("game_sessions").update({
      status: data.accept ? "active" : "declined",
      updated_at: new Date().toISOString(),
      ...(data.accept ? {} : { ended_at: new Date().toISOString() }),
    }).eq("id", data.sessionId).eq("status", "proposed").select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const submitMove = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    sessionId: z.string().uuid(),
    expectedMoveCount: z.number().int().min(0),
    action: z.record(z.string(), z.unknown()),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin.from("game_sessions")
      .select("*").eq("id", data.sessionId).maybeSingle();
    if (!session) throw new Error("Game not found");
    await requireRoom(supabaseAdmin, context.userId, session.room_id);
    if (session.status !== "active") throw new Error("Game is not running");
    if (!session.players.includes(context.userId)) throw new Error("Not your game");
    if (session.move_count !== data.expectedMoveCount) {
      return { stale: true as const, session };
    }

    const meta: Meta = { userId: context.userId, players: session.players };
    const nextState = applyAction(
      session.game_key,
      session.state,
      data.action as { type: string },
      meta,
    );

    const done = isFinished(session.game_key, nextState);
    const { data: updated, error } = await supabaseAdmin.from("game_sessions").update({
      state: nextState as never,
      move_count: session.move_count + 1,
      updated_at: new Date().toISOString(),
      winner_id: done.winnerId,
      ...(done.ended ? { status: "ended", ended_at: new Date().toISOString() } : {}),
    }).eq("id", session.id).eq("move_count", session.move_count).select("*").single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("game_moves").insert({
      session_id: session.id,
      user_id: context.userId,
      idx: session.move_count,
      action: data.action as never,
    });

    if (done.ended) await bumpStats(supabaseAdmin, session.room_id, session.game_key);
    return { stale: false as const, session: updated };
  });

function isFinished(gameKey: string, state: unknown): { ended: boolean; winnerId: string | null } {
  if (gameKey === "xo") {
    const s = state as { winner: string | null; draw: boolean };
    return { ended: false, winnerId: s.winner };
  }
  if (gameKey === "guess-me") {
    const s = state as { done: boolean };
    return { ended: s.done, winnerId: null };
  }
  if (gameKey === "fill-glass") {
    const s = state as { loser: string | null; winner: string | null };
    return { ended: false, winnerId: s.winner };
  }
  if (gameKey === "air-hockey") {
    const s = state as { done: boolean; winner: string | null };
    return { ended: s.done, winnerId: s.winner };
  }
  return { ended: false, winnerId: null };
}

async function bumpStats(admin: Admin, roomId: string, gameKey: string) {
  const { data: room } = await admin.from("rooms").select("pair_id").eq("id", roomId).maybeSingle();
  if (!room?.pair_id) return;
  const pairId = room.pair_id;
  const { data: stats } = await admin.from("pair_stats").select("*").eq("pair_id", pairId).maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const played = { ...((stats?.games_played ?? {}) as Record<string, number>) };
  played[gameKey] = (played[gameKey] ?? 0) + 1;
  const sameDay = stats?.last_played_on === today;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = sameDay
    ? (stats?.streak ?? 1)
    : stats?.last_played_on === yesterday ? (stats?.streak ?? 0) + 1 : 1;
  await admin.from("pair_stats").upsert({
    pair_id: pairId,
    streak,
    last_played_on: today,
    nights_played: (stats?.nights_played ?? 0) + (sameDay ? 0 : 1),
    games_played: played as never,
    updated_at: new Date().toISOString(),
  }, { onConflict: "pair_id" });
}

export const endSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin.from("game_sessions")
      .select("*").eq("id", data.sessionId).maybeSingle();
    if (!session) return { ok: true };
    await requireRoom(supabaseAdmin, context.userId, session.room_id);
    await supabaseAdmin.from("game_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", data.sessionId);
    return { ok: true };
  });

export const restartSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin.from("game_sessions")
      .select("*").eq("id", data.sessionId).maybeSingle();
    if (!session) throw new Error("Game not found");
    await requireRoom(supabaseAdmin, context.userId, session.room_id);

    let state: unknown;
    if (session.game_key === "xo") {
      const prev = session.state as { marks: Record<string, string>; scores: Record<string, number> };
      const prevSecond = Object.keys(prev.marks ?? {}).find((k) => prev.marks[k] === "O");
      state = xoInit(session.players, prevSecond, prev.scores);
    } else {
      state = await buildInitialState(supabaseAdmin, session.game_key, session.players, context.userId);
    }
    const { data: row, error } = await supabaseAdmin.from("game_sessions").update({
      state: state as never, move_count: 0, status: "active",
      winner_id: null, ended_at: null, updated_at: new Date().toISOString(),
    }).eq("id", session.id).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

// ===================== account deletion =====================

async function purgeUser(uid: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    const { data: files } = await supabaseAdmin.storage.from("avatars").list(uid);
    if (files?.length) {
      await supabaseAdmin.storage.from("avatars").remove(files.map((f) => `${uid}/${f.name}`));
    }
  } catch {
    // best effort
  }
  await supabaseAdmin.from("messages").delete().eq("user_id", uid);
  await supabaseAdmin.from("pair_members").delete().eq("user_id", uid);
  await supabaseAdmin.from("profiles").delete().eq("id", uid);
  const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
  if (error) throw new Error(error.message);
}

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const scheduledAt = new Date().toISOString();
    const { error } = await supabaseAdmin.from("profiles")
      .update({ deletion_scheduled_at: scheduledAt }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return {
      ok: true,
      scheduled_at: scheduledAt,
      purge_at: new Date(Date.now() + GRACE_DAYS * 86400000).toISOString(),
      grace_days: GRACE_DAYS,
    };
  });

export const cancelAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles")
      .update({ deletion_scheduled_at: null }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkAccountStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("profiles")
      .select("deletion_scheduled_at").eq("id", context.userId).maybeSingle();
    const scheduled = data?.deletion_scheduled_at ?? null;
    let purged = false;
    if (scheduled && (Date.now() - new Date(scheduled).getTime()) / 86400000 >= GRACE_DAYS) {
      await purgeUser(context.userId);
      purged = true;
    }
    return { purged, deletion_scheduled_at: purged ? null : scheduled, grace_days: GRACE_DAYS };
  });

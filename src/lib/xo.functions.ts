import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(b: (string | null)[]) {
  for (const line of LINES) {
    const [a, b1, c] = line;
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) {
      return { winner: b[a] as "X" | "O", line, draw: false };
    }
  }
  return { winner: null, line: null, draw: b.every((c) => c !== null) };
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const createRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    mode: z.enum(["classic", "blitz", "ranked"]).default("classic"),
    bet: z.number().int().min(0).max(10000).default(0),
    isQuick: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.bet > 0) {
      const { data: me } = await supabaseAdmin.from("profiles").select("coins").eq("id", context.userId).single();
      if (!me || me.coins < data.bet) throw new Error("Not enough coins for that bet");
    }
    for (let i = 0; i < 5; i++) {
      const code = genCode();
      const { data: row, error } = await supabaseAdmin.from("rooms").insert({
        code, host_id: context.userId, mode: data.mode, bet: data.bet, is_quick: data.isQuick,
      }).select("*").single();
      if (!error) return row;
      if (!error.message.includes("duplicate")) throw new Error(error.message);
    }
    throw new Error("Could not generate code");
  });

export const joinRoomByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().length(6) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.toUpperCase();
    const { data: room, error } = await supabaseAdmin.from("rooms").select("*").eq("code", code).maybeSingle();
    if (error) throw new Error(error.message);
    if (!room) throw new Error("Room not found");
    if (room.host_id === context.userId || room.guest_id === context.userId) return room;
    if (room.guest_id) throw new Error("Room is full");
    if (room.status !== "waiting") throw new Error("Room is not joinable");
    if (room.bet > 0) {
      const { data: me } = await supabaseAdmin.from("profiles").select("coins").eq("id", context.userId).single();
      if (!me || me.coins < room.bet) throw new Error("Not enough coins to join this bet");
    }
    const { data: updated, error: uerr } = await supabaseAdmin
      .from("rooms").update({ guest_id: context.userId, status: "playing", updated_at: new Date().toISOString() })
      .eq("id", room.id).eq("status", "waiting").select("*").single();
    if (uerr) throw new Error(uerr.message);
    if (updated.bet > 0) {
      const { error: rpcErr } = await supabaseAdmin.rpc("start_match", { _room_id: updated.id });
      if (rpcErr) throw new Error(rpcErr.message);
    }
    return updated;
  });

// Heartbeat — clients call this every ~20s so others can see they're online.
export const heartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", context.userId);
    return { ok: true };
  });

const ONLINE_WINDOW_SECONDS = 45;
const ACTIVE_MATCH_BUSY_SECONDS = 90;
const PENDING_INVITE_BUSY_SECONDS = 30;

type DbError = { message: string };
type DbResult = { data: unknown; error: DbError | null };
type DbQuery = PromiseLike<DbResult> & {
  or: (filters: string) => DbQuery;
  eq: (column: string, value: unknown) => DbQuery;
  gte: (column: string, value: string) => DbQuery;
  in: (column: string, values: string[]) => DbQuery;
  neq: (column: string, value: string) => DbQuery;
  limit: (count: number) => DbQuery;
};
type DbClient = { from: (table: string) => { select: (columns: string) => DbQuery } };
type BusyRoom = { host_id: string | null; guest_id: string | null; pending_guest_id?: string | null };
type OnlineTarget = { id: string; username: string; avatar_url: string | null };

async function getBusyPlayerIds(admin: DbClient, ids: string[], excludeRoomId?: string) {
  const busy = new Set<string>();
  if (!ids.length) return busy;

  const inList = ids.join(",");
  const busySince = new Date(Date.now() - ACTIVE_MATCH_BUSY_SECONDS * 1000).toISOString();
  let playingQuery = admin
    .from("rooms")
    .select("id, host_id, guest_id")
    .or(`host_id.in.(${inList}),guest_id.in.(${inList})`)
    .eq("status", "playing")
    .gte("updated_at", busySince);
  if (excludeRoomId) playingQuery = playingQuery.neq("id", excludeRoomId);

  const { data: playingRows, error: playingError } = await playingQuery;
  if (playingError) throw new Error(playingError.message);

  const pendingSince = new Date(Date.now() - PENDING_INVITE_BUSY_SECONDS * 1000).toISOString();
  let pendingQuery = admin
    .from("rooms")
    .select("id, pending_guest_id")
    .eq("status", "waiting")
    .in("pending_guest_id", ids)
    .gte("updated_at", pendingSince);
  if (excludeRoomId) pendingQuery = pendingQuery.neq("id", excludeRoomId);

  const { data: pendingRows, error: pendingError } = await pendingQuery;
  if (pendingError) throw new Error(pendingError.message);

  const playingRooms = (playingRows ?? []) as BusyRoom[];
  const pendingRooms = (pendingRows ?? []) as BusyRoom[];
  for (const r of playingRooms ?? []) {
    if (r.host_id) busy.add(r.host_id);
    if (r.guest_id) busy.add(r.guest_id);
  }
  for (const r of pendingRooms ?? []) {
    if (r.pending_guest_id) busy.add(r.pending_guest_id);
  }
  return busy;
}

// Pick a random online player not already busy in another room.
async function pickOnlineTarget(admin: DbClient, meId: string, exclude: string[]) {
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_SECONDS * 1000).toISOString();
  const { data: onlineRows } = await admin
    .from("profiles")
    .select("id, username, avatar_url")
    .gte("last_seen_at", onlineSince)
    .neq("id", meId)
    .limit(50);
  const online = (onlineRows ?? []) as OnlineTarget[];
  if (!online.length) return null;

  const exSet = new Set([meId, ...exclude]);
  const ids = online.map((p: { id: string }) => p.id).filter((id: string) => !exSet.has(id));
  if (!ids.length) return null;

  const busy = await getBusyPlayerIds(admin, ids);

  const pool = online.filter((p: { id: string }) => !busy.has(p.id) && !exSet.has(p.id));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Online players for the radar animation AND the pickable list.
// Excludes anyone already busy in another waiting/playing room.
export const getOnlinePlayers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_SECONDS * 1000).toISOString();
    const { data: online } = await supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_url, wins, losses, draws")
      .gte("last_seen_at", onlineSince)
      .neq("id", context.userId)
      .limit(50);
    if (!online?.length) return [];

    const ids = online.map((p) => p.id);
    // A player is "busy" only if they're actively in a recent playing match, or
    // already pending in a fresh invite. Stale games/invites are ignored so old
    // abandoned rooms don't hide everyone from Quick Play.
    const busy = await getBusyPlayerIds(supabaseAdmin as unknown as DbClient, ids);
    return online.filter((p) => !busy.has(p.id));

  });

// Start quick play: just create a waiting room. The host then picks from the list.
export const quickPlay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", context.userId);

    // Reuse an existing open quick room if there is one
    const { data: existing } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("host_id", context.userId)
      .eq("status", "waiting")
      .eq("is_quick", true)
      .is("guest_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return { ...existing, targetId: existing.pending_guest_id, mode: existing.pending_guest_id ? "inviting" as const : "searching" as const };

    for (let i = 0; i < 5; i++) {
      const code = genCode();
      const { data: row, error } = await supabaseAdmin
        .from("rooms")
        .insert({ code, host_id: context.userId, is_quick: true })
        .select("*")
        .single();
      if (!error) return { ...row, targetId: null, mode: "searching" as const };
      if (!error.message.includes("duplicate")) throw new Error(error.message);
    }
    throw new Error("Could not create room");
  });

// Host picks a player from the list — invite that specific user.
export const invitePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    roomId: z.string().uuid(),
    targetId: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room } = await supabaseAdmin
      .from("rooms").select("*").eq("id", data.roomId).single();
    if (!room || room.host_id !== context.userId) throw new Error("Not your room");
    if (room.status !== "waiting") throw new Error("Room not waiting");
    if (data.targetId === context.userId) throw new Error("Cannot invite yourself");

    // Mirror the list filtering exactly. If the player became busy after the
    // list loaded, return a safe result instead of throwing a runtime error.
    const busy = await getBusyPlayerIds(supabaseAdmin as unknown as DbClient, [data.targetId], data.roomId);
    if (busy.has(data.targetId)) {
      return { targetId: null, room, busy: true, message: "That player just became busy. Pick another opponent." };
    }


    const { data: updated, error } = await supabaseAdmin
      .from("rooms")
      .update({ pending_guest_id: data.targetId, updated_at: new Date().toISOString() })
      .eq("id", room.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { targetId: data.targetId, room: updated };
  });

// Cancel an outstanding invite (host changes their mind / picks another).
export const cancelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roomId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("rooms")
      .update({ pending_guest_id: null, updated_at: new Date().toISOString() })
      .eq("id", data.roomId)
      .eq("host_id", context.userId);
    return { ok: true };
  });

// Back-compat shim — picks first available and invites them.
export const inviteAnotherPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    roomId: z.string().uuid(),
    exclude: z.array(z.string().uuid()).default([]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const target = await pickOnlineTarget(supabaseAdmin, context.userId, data.exclude);
    if (!target) {
      await supabaseAdmin
        .from("rooms")
        .update({ pending_guest_id: null, updated_at: new Date().toISOString() })
        .eq("id", data.roomId);
      return { targetId: null };
    }
    await supabaseAdmin
      .from("rooms")
      .update({ pending_guest_id: target.id, updated_at: new Date().toISOString() })
      .eq("id", data.roomId);
    return { targetId: target.id };
  });

// Invitee accepts an invitation.
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roomId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room } = await supabaseAdmin
      .from("rooms").select("*").eq("id", data.roomId).single();
    if (!room) throw new Error("Room not found");
    if (room.pending_guest_id !== context.userId) throw new Error("Invite not for you");
    if (room.status !== "waiting") throw new Error("Room no longer waiting");

    const { data: updated, error } = await supabaseAdmin
      .from("rooms")
      .update({
        guest_id: context.userId,
        pending_guest_id: null,
        status: "playing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id)
      .eq("status", "waiting")
      .select("*")
      .single();
    if (error || !updated) throw new Error(error?.message ?? "Could not accept");
    if (updated.bet > 0) {
      const { error: rpcErr } = await supabaseAdmin.rpc("start_match", { _room_id: updated.id });
      if (rpcErr) throw new Error(rpcErr.message);
    }
    return updated;
  });

// Invitee declines.
export const declineInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roomId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("rooms")
      .update({ pending_guest_id: null, updated_at: new Date().toISOString() })
      .eq("id", data.roomId)
      .eq("pending_guest_id", context.userId)
      .eq("status", "waiting");
    return { ok: true };
  });

// Any invitation currently addressed to me (used as a poll fallback to realtime).
export const getPendingInviteForMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("id, code, host_id, bet, mode")
      .eq("pending_guest_id", context.userId)
      .eq("status", "waiting")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!room) return null;
    const { data: host } = await supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_url, wins, losses, draws")
      .eq("id", room.host_id)
      .maybeSingle();
    return { room, host };
  });

// Kept for back-compat with existing UI calls.
export const respondMatchRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roomId: z.string().uuid(), accept: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.accept) {
      const { data: room } = await supabaseAdmin
        .from("rooms").select("*").eq("id", data.roomId).single();
      if (!room) throw new Error("Room not found");
      if (room.pending_guest_id !== context.userId) throw new Error("Invite not for you");
      const { data: updated, error } = await supabaseAdmin
        .from("rooms")
        .update({
          guest_id: context.userId,
          pending_guest_id: null,
          status: "playing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", room.id).eq("status", "waiting").select("*").single();
      if (error || !updated) throw new Error(error?.message ?? "Could not accept");
      if (updated.bet > 0) await supabaseAdmin.rpc("start_match", { _room_id: updated.id });
      return { ok: true, accepted: true, room: updated };
    }
    await supabaseAdmin
      .from("rooms")
      .update({ pending_guest_id: null, updated_at: new Date().toISOString() })
      .eq("id", data.roomId)
      .eq("pending_guest_id", context.userId);
    return { ok: true, accepted: false };
  });

export const withdrawMatchRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roomId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("rooms")
      .update({ pending_guest_id: null, updated_at: new Date().toISOString() })
      .eq("id", data.roomId)
      .eq("pending_guest_id", context.userId)
      .eq("status", "waiting");
    return { ok: true };
  });

export const cancelQuickMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roomId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("rooms")
      .delete()
      .eq("id", data.roomId)
      .eq("host_id", context.userId)
      .eq("status", "waiting")
      .is("guest_id", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Profile info for a user id (used to show requester details).
export const getPlayerById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("id, username, avatar_url, wins, losses, draws")
      .eq("id", data.userId)
      .maybeSingle();
    return row;
  });



export const getRoomByCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().length(6) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.toUpperCase();
    const { data: room, error } = await supabaseAdmin.from("rooms").select("*").eq("code", code).maybeSingle();
    if (error) throw new Error(error.message);
    if (!room) throw new Error("Room not found");
    const ids = [room.host_id, room.guest_id].filter(Boolean) as string[];
    const { data: profs } = await supabaseAdmin.from("profiles").select("id, username, avatar_url, wins").in("id", ids);
    return {
      ...room,
      host: profs?.find((p) => p.id === room.host_id) ?? null,
      guest: room.guest_id ? profs?.find((p) => p.id === room.guest_id) ?? null : null,
      youAreHost: room.host_id === context.userId,
      youAreGuest: room.guest_id === context.userId,
    };
  });

export const makeMove = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roomId: z.string().uuid(), index: z.number().int().min(0).max(8) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room, error } = await supabaseAdmin.from("rooms").select("*").eq("id", data.roomId).single();
    if (error || !room) throw new Error("Room not found");
    if (room.status !== "playing") throw new Error("Game not in progress");
    const youMark = room.host_id === context.userId ? "X" : room.guest_id === context.userId ? "O" : null;
    if (!youMark) throw new Error("Not a participant");
    if (room.turn !== youMark) throw new Error("Not your turn");
    const board = room.board as (string | null)[];
    if (board[data.index]) throw new Error("Cell taken");
    const next = [...board];
    next[data.index] = youMark;
    const { winner, line, draw } = checkWinner(next);
    const updates: Record<string, unknown> = {
      board: next,
      turn: youMark === "X" ? "O" : "X",
      updated_at: new Date().toISOString(),
    };
    if (winner || draw) {
      updates.status = "finished";
      updates.winning_line = line;
      updates.is_draw = draw;
      const winnerId = winner ? (winner === "X" ? room.host_id : room.guest_id) : null;
      updates.winner_id = winnerId;
      if (winner === "X") updates.host_score = room.host_score + 1;
      if (winner === "O") updates.guest_score = room.guest_score + 1;
    }
    const { error: uerr } = await supabaseAdmin.from("rooms").update(updates as never).eq("id", room.id);
    if (uerr) throw new Error(uerr.message);
    if (winner || draw) {
      // Update win/loss/draw counters
      const ids = [room.host_id, room.guest_id].filter(Boolean) as string[];
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, wins, losses, draws, coins").in("id", ids);
      const winnerId = winner ? (winner === "X" ? room.host_id : room.guest_id) : null;
      for (const p of profs ?? []) {
        const patch: Record<string, number> = {};
        if (draw) patch.draws = p.draws + 1;
        else if (p.id === winnerId) patch.wins = p.wins + 1;
        else patch.losses = p.losses + 1;
        // Small "free-play" bonus only for 0-coin matches, to keep new players active.
        if (!draw && p.id === winnerId && room.bet === 0) {
          patch.coins = p.coins + 25;
        }
        await supabaseAdmin.from("profiles").update(patch as never).eq("id", p.id);
        if (!draw && p.id === winnerId && room.bet === 0) {
          await supabaseAdmin.from("coin_transactions").insert({
            user_id: p.id, delta: 25, balance_after: (patch.coins as number), source: "win_payout", ref: room.id,
          } as never);
        }
      }
      // Pay out the escrowed pot (no-op if bet was 0)
      if (room.bet > 0) {
        const { error: rpcErr } = await supabaseAdmin.rpc("finish_match", { _room_id: room.id });
        if (rpcErr) throw new Error(rpcErr.message);
      }
    }
    return { ok: true };
  });

export const rematch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ roomId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room } = await supabaseAdmin.from("rooms").select("*").eq("id", data.roomId).single();
    if (!room) throw new Error("Room not found");
    if (room.host_id !== context.userId && room.guest_id !== context.userId) throw new Error("Not a participant");
    if (room.bet > 0 && room.guest_id) {
      // Verify both players can afford the next round
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, coins").in("id", [room.host_id, room.guest_id]);
      for (const p of profs ?? []) {
        if (p.coins < room.bet) throw new Error("A player no longer has enough coins to rematch");
      }
    }
    const newTurn = room.winner_id === room.host_id ? "O" : "X";
    const { error } = await supabaseAdmin.from("rooms").update({
      board: [null, null, null, null, null, null, null, null, null],
      turn: newTurn,
      status: room.guest_id ? "playing" : "waiting",
      winner_id: null,
      winning_line: null,
      is_draw: false,
      round: room.round + 1,
      pot: 0,
      updated_at: new Date().toISOString(),
    }).eq("id", room.id);
    if (error) throw new Error(error.message);
    if (room.bet > 0 && room.guest_id) {
      const { error: rpcErr } = await supabaseAdmin.rpc("start_match", { _room_id: room.id });
      if (rpcErr) throw new Error(rpcErr.message);
    }
    return { ok: true };
  });


export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    roomId: z.string().uuid(),
    text: z.string().min(1).max(500),
    kind: z.enum(["chat", "reaction"]).default("chat"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("messages").insert({
      room_id: data.roomId, user_id: context.userId, text: data.text, kind: data.kind,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ search: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("profiles").select("id, username, avatar_url, wins, losses, draws").order("wins", { ascending: false }).limit(50);
    if (data.search) q = q.ilike("username", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const me = rows?.find((r) => r.id === context.userId) ?? null;
    return { rows: rows ?? [], me, myId: context.userId };
  });

export const getRecentMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rooms } = await supabaseAdmin
      .from("rooms").select("*").eq("status", "finished")
      .or(`host_id.eq.${context.userId},guest_id.eq.${context.userId}`)
      .order("updated_at", { ascending: false }).limit(10);
    const ids = new Set<string>();
    for (const r of rooms ?? []) {
      if (r.host_id) ids.add(r.host_id);
      if (r.guest_id) ids.add(r.guest_id);
    }
    const { data: profs } = await supabaseAdmin.from("profiles").select("id, username, avatar_url").in("id", [...ids]);
    const profById = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
    return (rooms ?? []).map((r) => {
      const opponentId = r.host_id === context.userId ? r.guest_id : r.host_id;
      return {
        id: r.id,
        code: r.code,
        opponent: opponentId ? profById[opponentId] ?? null : null,
        won: r.winner_id === context.userId,
        draw: r.is_draw,
        at: r.updated_at,
      };
    });
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
    avatar_url: z.string().url().max(1000).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const updates: { username?: string; avatar_url?: string | null } = {};
    if (data.username !== undefined) updates.username = data.username;
    if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url;
    if (Object.keys(updates).length === 0) return { ok: true };
    const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Cosmetics =====

export const getCosmetics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: catalog }, { data: owned }, { data: me }] = await Promise.all([
      supabaseAdmin.from("cosmetics").select("*").eq("active", true).order("kind").order("sort_order"),
      supabaseAdmin.from("user_cosmetics").select("cosmetic_id").eq("user_id", context.userId),
      supabaseAdmin.from("profiles").select("equipped_board, equipped_piece, equipped_frame, coins").eq("id", context.userId).single(),
    ]);
    const ownedIds = new Set((owned ?? []).map((r) => r.cosmetic_id));
    return {
      catalog: (catalog ?? []).map((c) => ({ ...c, owned: ownedIds.has(c.id) || c.price_coins === 0 })),
      equipped: {
        board: me?.equipped_board ?? "classic",
        piece: me?.equipped_piece ?? "classic",
        frame: me?.equipped_frame ?? "classic",
      },
      coins: me?.coins ?? 0,
    };
  });

export const purchaseCosmetic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ cosmeticId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cosmetic, error: cerr } = await supabaseAdmin.from("cosmetics").select("*").eq("id", data.cosmeticId).eq("active", true).maybeSingle();
    if (cerr) throw new Error(cerr.message);
    if (!cosmetic) throw new Error("Cosmetic not found");
    const { data: existing } = await supabaseAdmin.from("user_cosmetics").select("id").eq("user_id", context.userId).eq("cosmetic_id", cosmetic.id).maybeSingle();
    if (existing) return { ok: true, alreadyOwned: true };
    const { data: me } = await supabaseAdmin.from("profiles").select("coins, coins_spent_total").eq("id", context.userId).single();
    if (!me) throw new Error("Profile not found");
    if (me.coins < cosmetic.price_coins) throw new Error("Not enough coins");
    const newBalance = me.coins - cosmetic.price_coins;
    const { error: uerr } = await supabaseAdmin.from("profiles").update({
      coins: newBalance,
      coins_spent_total: me.coins_spent_total + cosmetic.price_coins,
    } as never).eq("id", context.userId);
    if (uerr) throw new Error(uerr.message);
    await supabaseAdmin.from("user_cosmetics").insert({ user_id: context.userId, cosmetic_id: cosmetic.id } as never);
    if (cosmetic.price_coins > 0) {
      await supabaseAdmin.from("coin_transactions").insert({
        user_id: context.userId, delta: -cosmetic.price_coins, balance_after: newBalance,
        source: "cosmetic_spend", ref: cosmetic.id,
      } as never);
    }
    return { ok: true };
  });

export const equipCosmetic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ cosmeticId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cosmetic } = await supabaseAdmin.from("cosmetics").select("*").eq("id", data.cosmeticId).eq("active", true).maybeSingle();
    if (!cosmetic) throw new Error("Cosmetic not found");
    if (cosmetic.price_coins > 0) {
      const { data: owned } = await supabaseAdmin.from("user_cosmetics").select("id").eq("user_id", context.userId).eq("cosmetic_id", cosmetic.id).maybeSingle();
      if (!owned) throw new Error("You don't own this cosmetic");
    }
    const col = cosmetic.kind === "board" ? "equipped_board"
      : cosmetic.kind === "piece" ? "equipped_piece"
      : cosmetic.kind === "frame" ? "equipped_frame" : null;
    if (!col) throw new Error("This cosmetic can't be equipped");
    const { error } = await supabaseAdmin.from("profiles").update({ [col]: cosmetic.slug } as never).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCoinHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("coin_transactions").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const GRACE_DAYS = 30;

async function purgeUser(uid: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("user_cosmetics").delete().eq("user_id", uid);
  await supabaseAdmin.from("coin_transactions").delete().eq("user_id", uid);
  await supabaseAdmin.from("messages").delete().eq("user_id", uid);
  await supabaseAdmin.from("rooms").delete().or(`host_id.eq.${uid},guest_id.eq.${uid}`);
  await supabaseAdmin.from("profiles").delete().eq("id", uid);
  const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
  if (error) throw new Error(error.message);
}

// Soft-delete: schedule account for permanent deletion in 30 days.
// User can sign back in and cancel anytime before then.
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const scheduledAt = new Date().toISOString();
    const purgeAt = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ deletion_scheduled_at: scheduledAt })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, scheduled_at: scheduledAt, purge_at: purgeAt, grace_days: GRACE_DAYS };
  });

export const cancelAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ deletion_scheduled_at: null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Called on every getMyProfile load: if grace window has elapsed, purge now.
async function purgeIfExpired(uid: string, scheduled: string | null) {
  if (!scheduled) return false;
  const elapsedDays = (Date.now() - new Date(scheduled).getTime()) / (24 * 60 * 60 * 1000);
  if (elapsedDays >= GRACE_DAYS) {
    await purgeUser(uid);
    return true;
  }
  return false;
}

export const checkAccountStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("deletion_scheduled_at")
      .eq("id", context.userId)
      .maybeSingle();
    const scheduled = data?.deletion_scheduled_at ?? null;
    const purged = await purgeIfExpired(context.userId, scheduled);
    return { purged, deletion_scheduled_at: purged ? null : scheduled, grace_days: GRACE_DAYS };
  });


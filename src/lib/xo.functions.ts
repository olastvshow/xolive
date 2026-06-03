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

export const quickPlay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Mark me online right now.
    await supabaseAdmin
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", context.userId);

    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_SECONDS * 1000).toISOString();

    // Find rooms hosted by online players, waiting, no guest and no pending request yet.
    const { data: waiting } = await supabaseAdmin
      .from("rooms")
      .select("*, host:profiles!rooms_host_id_fkey(id, username, avatar_url, wins, losses, draws, last_seen_at)")
      .eq("status", "waiting")
      .eq("is_quick", true)
      .neq("host_id", context.userId)
      .is("guest_id", null)
      .is("pending_guest_id", null)
      .order("created_at")
      .limit(10);

    const candidate = (waiting ?? []).find(
      (r) => r.host?.last_seen_at && r.host.last_seen_at >= onlineSince,
    );

    if (candidate) {
      // Send a join request — host must accept before the match starts.
      const { data: updated, error } = await supabaseAdmin
        .from("rooms")
        .update({ pending_guest_id: context.userId, updated_at: new Date().toISOString() })
        .eq("id", candidate.id)
        .eq("status", "waiting")
        .is("guest_id", null)
        .is("pending_guest_id", null)
        .select("*")
        .single();
      if (!error && updated) return { ...updated, mode: "requested" as const };
    }

    // Otherwise create our own waiting room and wait for someone to request us.
    for (let i = 0; i < 5; i++) {
      const code = genCode();
      const { data: row, error } = await supabaseAdmin.from("rooms").insert({
        code, host_id: context.userId, is_quick: true,
      }).select("*").single();
      if (!error) return { ...row, mode: "hosting" as const };
      if (!error.message.includes("duplicate")) throw new Error(error.message);
    }
    throw new Error("Could not start quick play");
  });

// Host accepts/declines an incoming request.
export const respondMatchRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    roomId: z.string().uuid(),
    accept: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room, error: rerr } = await supabaseAdmin
      .from("rooms").select("*").eq("id", data.roomId).single();
    if (rerr || !room) throw new Error("Room not found");
    if (room.host_id !== context.userId) throw new Error("Only the host can respond");
    if (!room.pending_guest_id) throw new Error("No pending request");

    if (!data.accept) {
      const { error } = await supabaseAdmin
        .from("rooms")
        .update({ pending_guest_id: null, updated_at: new Date().toISOString() })
        .eq("id", room.id);
      if (error) throw new Error(error.message);
      return { ok: true, accepted: false };
    }

    const { data: updated, error } = await supabaseAdmin
      .from("rooms")
      .update({
        guest_id: room.pending_guest_id,
        pending_guest_id: null,
        status: "playing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id)
      .eq("status", "waiting")
      .select("*")
      .single();
    if (error || !updated) throw new Error(error?.message ?? "Could not start match");
    if (updated.bet > 0) {
      const { error: rpcErr } = await supabaseAdmin.rpc("start_match", { _room_id: updated.id });
      if (rpcErr) throw new Error(rpcErr.message);
    }
    return { ok: true, accepted: true, room: updated };
  });

// Guest withdraws a pending request (cancels their own request to a host).
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
    // Only delete if still waiting and owned by caller (no opponent yet).
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


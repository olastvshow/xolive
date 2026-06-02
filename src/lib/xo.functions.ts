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
    const { data: updated, error: uerr } = await supabaseAdmin
      .from("rooms").update({ guest_id: context.userId, status: "playing", updated_at: new Date().toISOString() })
      .eq("id", room.id).eq("status", "waiting").select("*").single();
    if (uerr) throw new Error(uerr.message);
    return updated;
  });

export const quickPlay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: waiting } = await supabaseAdmin
      .from("rooms").select("*").eq("status", "waiting").eq("is_quick", true)
      .neq("host_id", context.userId).is("guest_id", null).order("created_at").limit(1);
    if (waiting && waiting.length) {
      const r = waiting[0];
      const { data: updated, error } = await supabaseAdmin
        .from("rooms").update({ guest_id: context.userId, status: "playing", updated_at: new Date().toISOString() })
        .eq("id", r.id).eq("status", "waiting").is("guest_id", null).select("*").single();
      if (!error && updated) return updated;
    }
    // create
    for (let i = 0; i < 5; i++) {
      const code = genCode();
      const { data: row, error } = await supabaseAdmin.from("rooms").insert({
        code, host_id: context.userId, is_quick: true,
      }).select("*").single();
      if (!error) return row;
      if (!error.message.includes("duplicate")) throw new Error(error.message);
    }
    throw new Error("Could not start quick play");
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
    const { error: uerr } = await supabaseAdmin.from("rooms").update(updates).eq("id", room.id);
    if (uerr) throw new Error(uerr.message);
    if (winner || draw) {
      // update profile stats
      const ids = [room.host_id, room.guest_id].filter(Boolean) as string[];
      const { data: profs } = await supabaseAdmin.from("profiles").select("*").in("id", ids);
      for (const p of profs ?? []) {
        const patch: Record<string, number> = {};
        if (draw) patch.draws = p.draws + 1;
        else if (p.id === (winner === "X" ? room.host_id : room.guest_id)) {
          patch.wins = p.wins + 1;
          patch.coins = p.coins + 50 + room.bet;
        } else {
          patch.losses = p.losses + 1;
          patch.coins = Math.max(0, p.coins - room.bet);
        }
        await supabaseAdmin.from("profiles").update(patch).eq("id", p.id);
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
    const newTurn = room.winner_id === room.host_id ? "O" : "X";
    const { error } = await supabaseAdmin.from("rooms").update({
      board: [null, null, null, null, null, null, null, null, null],
      turn: newTurn,
      status: room.guest_id ? "playing" : "waiting",
      winner_id: null,
      winning_line: null,
      is_draw: false,
      round: room.round + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", room.id);
    if (error) throw new Error(error.message);
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

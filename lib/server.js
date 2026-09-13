// Server-side Supabase helpers (API routes only — never import from client code).
// Uses the service-role key so progression math runs in a trusted environment.
// RLS still applies to all direct client access; these routes re-verify ownership.
import { createClient } from "@supabase/supabase-js";
import {
  completeMission as calcCompletion,
  SHOP_ITEMS,
  defaultProfile,
  normalizeProfile,
} from "@/lib/gameLogic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const err = new Error("Server progression unavailable (missing service key).");
    err.status = 501;
    throw err;
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function authedUser(supabase, request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    const err = new Error("Sign in required.");
    err.status = 401;
    throw err;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    const err = new Error("Invalid or expired session.");
    err.status = 401;
    throw err;
  }
  return data.user;
}

async function loadProfile(supabase, userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
  if (error || !data) return defaultProfile(userId);
  return normalizeProfile({ ...data });
}

export async function completeQuestServer(request) {
  const supabase = serviceClient();
  const user = await authedUser(supabase, request);
  const body = await request.json().catch(() => ({}));
  const missionId = typeof body.missionId === "string" ? body.missionId.trim() : "";
  if (!missionId || missionId.length > 80) {
    const err = new Error("A valid missionId is required.");
    err.status = 400;
    throw err;
  }

  const { data: mission, error: mErr } = await supabase
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .single();
  if (mErr || !mission || mission.user_id !== user.id) {
    const err = new Error("Mission not found.");
    err.status = 404;
    throw err;
  }
  if (mission.status === "done") {
    const err = new Error("Mission already completed — duplicate rewards blocked.");
    err.status = 409;
    throw err;
  }

  const profile = await loadProfile(supabase, user.id);
  const res = calcCompletion(profile, mission);
  const stamp = new Date().toISOString();

  const { error: uErr } = await supabase
    .from("missions")
    .update({ status: "done", completed_at: stamp })
    .eq("id", missionId);
  if (uErr) {
    const err = new Error("Could not record completion. Try again.");
    err.status = 502;
    throw err;
  }
  const { data: saved, error: pErr } = await supabase
    .from("profiles")
    .upsert({ ...res.profile, updated_at: stamp }, { onConflict: "user_id" })
    .select()
    .single();
  if (pErr) {
    const err = new Error("Could not grant rewards. Try again.");
    err.status = 502;
    throw err;
  }
  return {
    profile: { ...saved, attributes: normalizeAttributes(saved.attributes), owned_items: saved.owned_items || [] },
    mission: { ...mission, status: "done", completed_at: stamp },
    leveledUp: res.leveledUp,
    levelsGained: res.levelsGained,
    reward: res.reward,
    attr: res.attr,
  };
}

export async function purchaseItemServer(request) {
  const supabase = serviceClient();
  const user = await authedUser(supabase, request);
  const body = await request.json().catch(() => ({}));
  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) {
    const err = new Error("Unknown item.");
    err.status = 400;
    throw err;
  }

  const profile = await loadProfile(supabase, user.id);
  const owned = profile.owned_items || [];
  if (owned.includes(item.id)) {
    const err = new Error("Item already owned — repurchase blocked.");
    err.status = 409;
    throw err;
  }
  if ((profile.level || 1) < item.unlockLevel) {
    const err = new Error(`Requires level ${item.unlockLevel}.`);
    err.status = 403;
    throw err;
  }
  if ((profile.coins || 0) < item.price) {
    const err = new Error("Not enough coins.");
    err.status = 402;
    throw err;
  }

  const stamp = new Date().toISOString();
  const { data: saved, error: pErr } = await supabase
    .from("profiles")
    .upsert(
      { ...profile, coins: profile.coins - item.price, owned_items: [...owned, item.id], updated_at: stamp },
      { onConflict: "user_id" }
    )
    .select()
    .single();
  if (pErr) {
    const err = new Error("Purchase failed. Try again.");
    err.status = 502;
    throw err;
  }
  return {
    profile: { ...saved, attributes: normalizeAttributes(saved.attributes), owned_items: saved.owned_items || [] },
    item,
  };
}

export function toResponse(fn) {
  return async (request) => {
    try {
      const data = await fn(request);
      return Response.json(data, { status: 200 });
    } catch (e) {
      const status = e.status || 500;
      return Response.json({ error: e.message || "Unexpected server error." }, { status });
    }
  };
}

// Dual store: Supabase (production, mandatory) + localStorage demo fallback.
// IMPORTANT: Submission must use Supabase. Demo mode is only for UI testing
// before adding env keys. The app shows a warning banner in demo mode.
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { defaultProfile, normalizeProfile } from "./gameLogic";

const DEMO_KEY = "pp_demo_state_v1";

function loadDemo() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      s.profile = normalizeProfile({ ...defaultProfile("demo-user"), ...(s.profile || {}) });
      if (!Array.isArray(s.missions)) s.missions = [];
      return s;
    }
  } catch {}
  return { profile: defaultProfile("demo-user"), missions: [] };
}

function saveDemo(state) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(state)); } catch {}
}

export const store = {
  isDemo: !isSupabaseConfigured,

  async getUser() {
    if (!isSupabaseConfigured) {
      let u = null;
      try { u = JSON.parse(localStorage.getItem("pp_demo_user") || "null"); } catch {}
      return u;
    }
    const { data } = await supabase.auth.getUser();
    return data?.user ?? null;
  },

  async signUp(email, password) {
    if (!isSupabaseConfigured) {
      const user = { id: "demo-user", email };
      localStorage.setItem("pp_demo_user", JSON.stringify(user));
      const state = loadDemo();
      state.profile.user_id = "demo-user";
      saveDemo(state);
      return { user, error: null };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { user: data?.user ?? null, error };
  },

  async signIn(email, password) {
    if (!isSupabaseConfigured) {
      const user = { id: "demo-user", email };
      localStorage.setItem("pp_demo_user", JSON.stringify(user));
      return { user, error: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data?.user ?? null, error };
  },

  async getProfile(userId) {
    if (!isSupabaseConfigured) return loadDemo().profile;
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    if (error || !data) return defaultProfile(userId);
    return normalizeProfile({ ...data });
  },

  async saveProfile(profile) {
    if (!isSupabaseConfigured) {
      const state = loadDemo();
      state.profile = profile;
      saveDemo(state);
      return profile;
    }
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ ...profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listMissions(userId) {
    if (!isSupabaseConfigured) return loadDemo().missions;
    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addMission(userId, mission) {
    if (!mission.title || !mission.title.trim()) throw new Error("Mission title is required.");
    if (!isSupabaseConfigured) {
      const state = loadDemo();
      const row = { id: "m-" + Date.now(), user_id: userId, status: "active", created_at: new Date().toISOString(), ...mission, title: mission.title.trim() };
      state.missions = [row, ...(state.missions || [])];
      saveDemo(state);
      return row;
    }
    const { data, error } = await supabase
      .from("missions")
      .insert({ user_id: userId, status: "active", ...mission, title: mission.title.trim() })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateMission(id, patch) {
    if (!isSupabaseConfigured) {
      const state = loadDemo();
      state.missions = (state.missions || []).map((m) => (m.id === id ? { ...m, ...patch } : m));
      saveDemo(state);
      return state.missions.find((m) => m.id === id);
    }
    const { data, error } = await supabase.from("missions").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteMission(id) {
    if (!isSupabaseConfigured) {
      const state = loadDemo();
      state.missions = (state.missions || []).filter((m) => m.id !== id);
      saveDemo(state);
      return true;
    }
    const { error } = await supabase.from("missions").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  // Trusted server path: rewards computed via /api with the service key.
  // Returns null when unavailable so callers fall back to the direct path.
  async apiComplete(missionId) {
    if (!isSupabaseConfigured) return null;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return null;
      const res = await fetch("/api/quests/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ missionId }),
      });
      if (res.status === 501) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Completion failed on the server.");
      return data;
    } catch (e) {
      if (e && e.message === "Failed to fetch") return null;
      throw e;
    }
  },

  async apiPurchase(itemId) {
    if (!isSupabaseConfigured) return null;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return null;
      const res = await fetch("/api/vault/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ itemId }),
      });
      if (res.status === 501) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Purchase failed on the server.");
      return data;
    } catch (e) {
      if (e && e.message === "Failed to fetch") return null;
      throw e;
    }
  },
};

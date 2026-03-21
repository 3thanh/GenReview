import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { getVariationPromptForPersona } from "../lib/demo-feed";
import type { Persona } from "../lib/personas";
import type { ContentItem } from "../types/database";

const DEMO_BIZ_NAME = "ContentSwipe Demo";

/**
 * Kicks off background video generation for each unapproved persona.
 * When a video completes, it calls onNewCard and chains the next generation.
 * Stops generating for a persona once it appears in approvedPersonaIds.
 */
export function useBackgroundGeneration(
  enabled: boolean,
  personas: Persona[],
  approvedPersonaIds: string[],
  onNewCard: (card: ContentItem) => void
) {
  const stateRef = useRef({
    active: false,
    bizId: null as string | null,
    sessionId: null as string | null,
    pendingPersonas: new Set<string>(),
    trackedItems: new Set<string>(),
    approved: new Set<string>(approvedPersonaIds),
    personas,
    onNewCard,
  });

  stateRef.current.approved = new Set(approvedPersonaIds);
  stateRef.current.personas = personas;
  stateRef.current.onNewCard = onNewCard;

  useEffect(() => {
    if (!enabled) return;

    const state = stateRef.current;
    state.active = true;
    state.pendingPersonas.clear();
    state.trackedItems.clear();
    state.bizId = null;
    state.sessionId = null;

    async function setup() {
      const { data: existing } = await supabase
        .from("businesses")
        .select("id")
        .eq("name", DEMO_BIZ_NAME)
        .single();

      if (existing) {
        state.bizId = existing.id;
      } else {
        const { data: biz, error } = await supabase
          .from("businesses")
          .insert({
            name: DEMO_BIZ_NAME,
            description: "Background generation for demo mode",
          })
          .select()
          .single();
        if (error || !biz)
          throw new Error(`Business creation failed: ${error?.message}`);
        state.bizId = biz.id;
      }

      const { data: session, error: sessErr } = await supabase
        .from("sessions")
        .insert({
          business_id: state.bizId,
          name: `Demo ${Date.now()}`,
        })
        .select()
        .single();
      if (sessErr || !session)
        throw new Error(`Session creation failed: ${sessErr?.message}`);
      state.sessionId = session.id;
    }

    async function triggerForPersona(persona: Persona) {
      if (!state.active || !state.bizId || !state.sessionId) return;
      if (state.pendingPersonas.has(persona.id)) return;
      if (state.approved.has(persona.id)) return;

      state.pendingPersonas.add(persona.id);

      try {
        const prompt = getVariationPromptForPersona(persona);

        const { data: item, error: itemErr } = await supabase
          .from("content_items")
          .insert({
            title: `${persona.name} — Variation`,
            body_text: `Background variation for ${persona.name}`,
            business_id: state.bizId,
            session_id: state.sessionId,
            persona_id: persona.id,
            content_type: "video" as const,
            channel: "tiktok",
            review_mode: "video",
            source_type: "generated",
            prompt_input_summary: `Demo variation: ${persona.name}`,
            generation_status: "queued",
          })
          .select()
          .single();

        if (itemErr || !item) {
          state.pendingPersonas.delete(persona.id);
          console.error(
            `[bg-gen] Item failed for ${persona.name}:`,
            itemErr?.message
          );
          return;
        }

        state.trackedItems.add(item.id);

        const { error: jobErr } = await supabase
          .from("generation_jobs")
          .insert({
            prompt,
            content_item_id: item.id,
            status: "queued",
            job_type: "initial",
          });

        if (jobErr) {
          state.pendingPersonas.delete(persona.id);
          console.error(
            `[bg-gen] Job failed for ${persona.name}:`,
            jobErr.message
          );
        } else {
          console.log(
            `[bg-gen] Queued generation for ${persona.name} (item ${item.id})`
          );
        }
      } catch (err) {
        state.pendingPersonas.delete(persona.id);
        console.error(`[bg-gen] Error for ${persona.name}:`, err);
      }
    }

    async function start() {
      try {
        await setup();
        for (const persona of state.personas) {
          if (!state.active) break;
          if (persona.id === "all") continue;
          if (state.approved.has(persona.id)) continue;
          await triggerForPersona(persona);
        }
      } catch (err) {
        console.error("[bg-gen] Startup failed:", err);
      }
    }

    start();

    const channelName = `demo_bg_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "content_items" },
        (payload: any) => {
          const item = payload.new as ContentItem;
          if (!item || !state.trackedItems.has(item.id)) return;
          if (!item.video_url || item.generation_status !== "completed") return;

          const pid = item.persona_id;
          if (pid && state.approved.has(pid)) return;

          state.onNewCard(item);

          if (pid) {
            state.pendingPersonas.delete(pid);
            if (!state.approved.has(pid)) {
              const persona = state.personas.find((p) => p.id === pid);
              if (persona) triggerForPersona(persona);
            }
          }
        }
      )
      .subscribe();

    return () => {
      state.active = false;
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}

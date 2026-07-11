import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { describeScene, sortHazards } from "@/lib/ai/vision";
import {
  FREE_DAILY_LIMIT,
  getTodayUsageCount,
  incrementUsageCount,
  isProUser,
  logAudit,
  logTouchpoint,
} from "@/lib/db/actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { anonId, imageDataUrl, language } = body as {
      anonId?: string;
      imageDataUrl?: string;
      language?: "en" | "zh";
    };

    if (!anonId || !imageDataUrl) {
      return NextResponse.json(
        { error: "anonId and imageDataUrl are required" },
        { status: 400 },
      );
    }
    const lang = language === "zh" ? "zh" : "en";

    const supabase = await createClient();

    const pro = await isProUser(supabase, anonId);
    const usageCount = await getTodayUsageCount(supabase, anonId);
    if (!pro && usageCount >= FREE_DAILY_LIMIT) {
      return NextResponse.json(
        { error: "limit_reached", usageCount, limit: FREE_DAILY_LIMIT },
        { status: 402 },
      );
    }

    const result = await describeScene(imageDataUrl, lang);
    const hazards = sortHazards(result.hazards);

    const { data: session, error } = await supabase
      .from("scene_sessions")
      .insert({
        user_id: anonId,
        image_url: imageDataUrl,
        description: result.description,
        description_source: result.source,
        description_confidence: result.confidence,
        description_review_status: "unreviewed",
        hazards,
        hazards_source: result.source,
        hazards_confidence: result.confidence,
        hazards_review_status: "unreviewed",
        language: lang,
      })
      .select()
      .single();

    if (error || !session) {
      console.error("[api/describe] insert failed:", error);
      return NextResponse.json(
        { error: "Vision couldn't see clearly — try again" },
        { status: 500 },
      );
    }

    const newCount = await incrementUsageCount(supabase, anonId);

    await logTouchpoint(supabase, anonId, "scene_described", {
      sessionId: session.id,
    });
    if (hazards.length > 0) {
      await logTouchpoint(supabase, anonId, "hazard_detected", {
        sessionId: session.id,
        count: hazards.length,
      });
    }
    await logAudit(supabase, anonId, "describe", "scene_sessions", session.id, {
      source: result.source,
    });

    return NextResponse.json({
      session,
      usageCount: newCount,
      limit: FREE_DAILY_LIMIT,
      isPro: pro,
    });
  } catch (err) {
    console.error("[api/describe]", err);
    return NextResponse.json(
      { error: "Vision couldn't see clearly — try again" },
      { status: 500 },
    );
  }
}

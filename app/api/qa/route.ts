import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerQuestion } from "@/lib/ai/vision";
import { logAudit, logTouchpoint } from "@/lib/db/actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { anonId, sessionId, question, language } = body as {
      anonId?: string;
      sessionId?: string;
      question?: string;
      language?: "en" | "zh";
    };

    if (!anonId || !sessionId || !question?.trim()) {
      return NextResponse.json(
        { error: "anonId, sessionId and question are required" },
        { status: 400 },
      );
    }
    const lang = language === "zh" ? "zh" : "en";

    const supabase = await createClient();

    const { data: session } = await supabase
      .from("scene_sessions")
      .select("description")
      .eq("id", sessionId)
      .maybeSingle();

    const result = await answerQuestion(
      question.trim(),
      session?.description ?? "",
      lang,
    );

    const { data: qa, error } = await supabase
      .from("qa_exchanges")
      .insert({
        user_id: anonId,
        session_id: sessionId,
        question: question.trim(),
        answer: result.answer,
        answer_source: result.source,
        answer_confidence: result.confidence,
        answer_review_status: "unreviewed",
        language: lang,
      })
      .select()
      .single();

    if (error || !qa) {
      console.error("[api/qa] insert failed:", error);
      return NextResponse.json(
        { error: "Vision couldn't answer that — try again" },
        { status: 500 },
      );
    }

    await logTouchpoint(supabase, anonId, "qa_asked", { sessionId, qaId: qa.id });
    await logAudit(supabase, anonId, "answer_question", "qa_exchanges", qa.id, {
      source: result.source,
    });

    return NextResponse.json({ qa });
  } catch (err) {
    console.error("[api/qa]", err);
    return NextResponse.json(
      { error: "Vision couldn't answer that — try again" },
      { status: 500 },
    );
  }
}

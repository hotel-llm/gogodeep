import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topics } = await req.json();

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return new Response(JSON.stringify({ error: "No topics provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const topicList = topics.slice(0, 5).join(", ");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: `You are a STEM tutor generating short recap quiz questions to help students consolidate their understanding of concepts they previously struggled with. Questions should be concise, clear, and directly target the concept. Always use the generate_quiz tool.`,
        messages: [
          {
            role: "user",
            content: `Generate one multiple-choice quiz question for each of these STEM concepts the student previously struggled with: ${topicList}. Each question should test core understanding, not just recall.`,
          },
        ],
        tools: [
          {
            name: "generate_quiz",
            description: "Return a list of multiple-choice quiz questions.",
            input_schema: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      topic: { type: "string", description: "The concept this question targets" },
                      question: { type: "string", description: "The question text" },
                      options: {
                        type: "array",
                        items: { type: "string" },
                        description: "Exactly 4 answer options",
                      },
                      correct: { type: "number", description: "0-indexed position of the correct option" },
                      explanation: { type: "string", description: "Brief explanation of why the correct answer is right" },
                    },
                    required: ["topic", "question", "options", "correct", "explanation"],
                  },
                },
              },
              required: ["questions"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "generate_quiz" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to generate quiz" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolUse = data.content?.find((block: any) => block.type === "tool_use");

    if (!toolUse) {
      return new Response(JSON.stringify({ error: "AI did not return quiz data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(toolUse.input), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

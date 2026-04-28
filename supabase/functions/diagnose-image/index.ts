const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MATH = `
MATHEMATICAL NOTATION: Express all math using LaTeX delimiters — inline as $...$ and display as $$...$$. Use LaTeX for all variables, fractions (\\frac{}{}), integrals (\\int), exponents, Greek letters, square roots (\\sqrt{}), etc. Never write math in plain text.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image, mimeType, mode = "identify", text, practice_count, topic, start_id, what_happened, complexity = 2 } = body;
    console.log("diagnose-image invoked, mode:", mode, "text:", !!text);

    function complexityInstruction(level: number): string {
      if (level === 1) return " Complexity level: SIMPLE. Use very plain everyday language a 14-year-old could follow. No jargon. Break every step into the smallest possible sub-steps. Use analogies instead of formulas where possible.";
      if (level === 3) return " Complexity level: ADVANCED. Use precise IB/AP/A-Level academic terminology throughout. Reference standard theorems and rules by name. Keep steps concise — assume solid foundational knowledge.";
      if (level === 4) return " Complexity level: EXPERT. Use full university-level rigour and formal notation. Be dense and precise. Cite theorems, proofs, and edge cases where relevant. Assume deep mathematical maturity.";
      return " Complexity level: STANDARD. Use clear, accessible language with standard high-school terminology.";
    }

    function stepsDescription(level: number): string {
      if (level === 1) return "Complete step-by-step solution written in plain language for a beginner. Each step must be very small and self-contained — no skipped reasoning. Prefer words over formulas where possible. $...$ for inline math, $$...$$ for display equations.";
      if (level === 3) return "Complete step-by-step solution using precise academic terminology. Each step is a clear, concise instruction referencing relevant rules or theorems by name. $...$ for inline math, $$...$$ for display equations.";
      if (level === 4) return "Rigorous step-by-step solution with full formal notation. Concise and dense — no hand-holding. Include theorem names, edge cases, and proof reasoning where relevant. $...$ for inline math, $$...$$ for display equations.";
      return "Complete step-by-step solution. Each step is one clear instruction. $...$ for inline math, $$...$$ for display equations.";
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    async function callAnthropic(payload: object) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 8096, ...payload }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Anthropic error:", res.status, err);
        if (res.status === 429) throw new Error("Rate limited. Please try again in a moment.");
        throw new Error("AI analysis failed");
      }
      return res.json();
    }

    // ── guide_steps: steps + metadata only, no concept or practice ──────────
    if (mode === "guide_steps") {
      const data = await callAnthropic({
        system: `You are an expert STEM tutor. Break down the student's question step by step and generate 3 practice problems with multiple-choice options. If the image is NOT a STEM question or is too blurry, set input_status accordingly. You MUST use the guide_steps tool.${complexityInstruction(complexity)}${MATH}`,
        messages: [{
          role: "user",
          content: text
            ? [{ type: "text", text: `Walk me through this step by step.\n\nQuestion: ${text}` }]
            : [
                { type: "image", source: { type: "base64", media_type: mimeType || "image/png", data: image } },
                { type: "text", text: "Walk me through this question step by step." },
              ],
        }],
        tools: [{
          name: "guide_steps",
          description: "Return step-by-step solution and metadata for the student's question.",
          input_schema: {
            type: "object",
            properties: {
              concept_label: { type: "string", description: "2-3 word label for the concept, e.g. 'Quadratic Formula'" },
              question_summary: { type: "string", description: "One sentence describing what the question asks." },
              what_happened: { type: "string", description: "1-2 sentences. Describe exactly what this problem asks the student to find or do. Reference key numbers, variables, or conditions from the question. Under 50 words. Do NOT mention student errors or working." },
              steps: {
                type: "array", items: { type: "string" },
                description: stepsDescription(complexity),
              },
              practice_problems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    question: { type: "string", description: "A practice question on the same concept." },
                    answer: { type: "string", description: "The correct answer. Use a plain value (number, expression, short phrase). $...$ for math." },
                    options: {
                      type: "array", items: { type: "string" }, minItems: 4, maxItems: 4,
                      description: "Exactly 4 answer choices. options[0] is the CORRECT answer. ALL 4 must be the same type and format — if the answer is a plain number, all options are plain numbers; if the answer has units, all options have the same units; if an expression, all are expressions. Wrong options must be plausible but clearly distinct. No mixing of formats.",
                    },
                  },
                  required: ["id", "question", "answer", "options"],
                },
                description: "Exactly 3 practice problems on the same concept. Each has 4 MC options of identical format.",
              },
              input_status: { type: "string", enum: ["ok", "blurry", "not_stem"], description: "Input quality check." },
            },
            required: ["concept_label", "question_summary", "what_happened", "steps", "practice_problems", "input_status"],
          },
        }],
        tool_choice: { type: "tool", name: "guide_steps" },
      });
      const tool = data.content?.find((b: any) => b.type === "tool_use");
      if (!tool) return new Response(JSON.stringify({ error: "AI did not return structured output" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ...tool.input, mode: "guide" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── guide_concept: concept explanation only (text-only, fast) ────────────
    if (mode === "guide_concept") {
      const contextText = what_happened ? `Problem context: ${what_happened}\n\n` : "";
      const data = await callAnthropic({
        system: `You are an expert STEM tutor. Explain concepts concisely.${complexityInstruction(complexity)} Use LaTeX: $...$ inline, $$...$$ display.`,
        messages: [{ role: "user", content: [{ type: "text", text: `${contextText}Topic: ${topic ?? "STEM"}\n\nExplain the underlying concept and recognition cue.` }] }],
        tools: [{
          name: "concept_explanation",
          description: "Return the concept explanation and recognition cue.",
          input_schema: {
            type: "object",
            properties: {
              core_concept: { type: "string", description: "2-3 sentences. State the core rule, the key 'why', and the most common misconception. General terms only — no reference to this specific problem. Under 50 words." },
              recognition_cue: { type: "string", description: "2 sentences. Begin with 'When you see...' — state the signal and the first step to take. Under 50 words." },
            },
            required: ["core_concept", "recognition_cue"],
          },
        }],
        tool_choice: { type: "tool", name: "concept_explanation" },
      });
      const tool = data.content?.find((b: any) => b.type === "tool_use");
      return new Response(JSON.stringify(tool?.input ?? {}), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── more_practice: generate N practice problems on a topic ───────────────
    if (mode === "more_practice") {
      const count = practice_count ?? 2;
      const idStart = start_id ?? 1;
      const data = await callAnthropic({
        system: `You are an expert STEM tutor. Generate original practice problems. Use LaTeX: $...$ inline, $$...$$ display.`,
        messages: [{ role: "user", content: [{ type: "text", text: `Generate ${count} practice problems on: ${topic ?? "STEM"}` }] }],
        tools: [{
          name: "generate_practice",
          description: "Return practice problems.",
          input_schema: {
            type: "object",
            properties: {
              practice_problems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    question: { type: "string" },
                    answer: { type: "string" },
                    options: {
                      type: "array", items: { type: "string" }, minItems: 4, maxItems: 4,
                      description: "Exactly 4 MC options. options[0] is correct. All options must be same type/format. No mixing formats.",
                    },
                  },
                  required: ["id", "question", "answer", "options"],
                },
                description: `Exactly ${count} problems. Start IDs at ${idStart}. $...$ LaTeX for all math. Answers must be whole numbers, simple fractions, or short text. Each has 4 MC options of identical format.`,
              },
            },
            required: ["practice_problems"],
          },
        }],
        tool_choice: { type: "tool", name: "generate_practice" },
      });
      const tool = data.content?.find((b: any) => b.type === "tool_use");
      return new Response(JSON.stringify(tool?.input ?? { practice_problems: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── guide / identify: legacy full-response modes (backwards compat) ──────
    const isGuide = mode === "guide";
    const practiceCount = practice_count ?? 3;

    const systemPrompt = isGuide
      ? `You are an expert STEM tutor. Break down the student's question step by step. If the image is NOT a STEM question or is too blurry, set input_status accordingly. You MUST use the guide_question tool.${MATH}`
      : `You are an expert STEM tutor specializing in diagnosing errors in student work. Identify the EXACT point where the logic breaks down. If the image is NOT STEM student working or is too blurry, set input_status accordingly. You MUST use the diagnose_error tool.${MATH}`;

    const tools = isGuide ? [{
      name: "guide_question",
      description: "Return a structured step-by-step guide with concept and practice.",
      input_schema: {
        type: "object",
        properties: {
          concept_label: { type: "string", description: "2-3 word concept label." },
          question_summary: { type: "string", description: "One sentence describing the question." },
          what_happened: { type: "string", description: "2-3 sentences about this specific problem. Reference actual numbers/expressions." },
          core_concept: { type: "string", description: "2-3 sentences. Core rule in general terms, key 'why', most common misconception." },
          recognition_cue: { type: "string", description: "2 sentences. 'When you see...' signal, first step, top trap." },
          steps: { type: "array", items: { type: "string" }, description: "Step-by-step solution. $...$ inline math, $$...$$ display." },
          practice_problems: {
            type: "array",
            items: { type: "object", properties: { id: { type: "number" }, question: { type: "string" }, answer: { type: "string" } }, required: ["id", "question", "answer"] },
            description: `Exactly ${practiceCount} practice problems. $...$ LaTeX. Answers must be whole numbers, simple fractions, or short text.`,
          },
          input_status: { type: "string", enum: ["ok", "blurry", "not_stem"] },
        },
        required: ["concept_label", "question_summary", "what_happened", "core_concept", "recognition_cue", "steps", "practice_problems", "input_status"],
      },
    }] : [{
      name: "diagnose_error",
      description: "Return a structured diagnosis with concept and practice.",
      input_schema: {
        type: "object",
        properties: {
          error_category: { type: "string", enum: ["Conceptual", "Procedural", "Computational", "Notational", "Correct"] },
          error_tag: { type: "string", description: "Short label, e.g. 'Sign Error'. Use 'All correct' if correct." },
          explanation: { type: "string", description: "2-3 sentences: where and why the logic broke down." },
          what_happened: { type: "string", description: "2-3 sentences about this specific problem. Reference actual numbers/steps." },
          core_concept: { type: "string", description: "2-3 sentences. Core rule in general terms, key 'why', most common misconception." },
          recognition_cue: { type: "string", description: "2 sentences. 'When you see...' signal, first step, top trap." },
          practice_problems: {
            type: "array",
            items: { type: "object", properties: { id: { type: "number" }, question: { type: "string" }, answer: { type: "string" } }, required: ["id", "question", "answer"] },
            description: `Exactly ${practiceCount} practice problems targeting this weakness. $...$ LaTeX. Answers must be whole numbers, simple fractions, or short text.`,
          },
          input_status: { type: "string", enum: ["ok", "blurry", "not_stem"] },
        },
        required: ["error_category", "error_tag", "explanation", "what_happened", "core_concept", "recognition_cue", "practice_problems", "input_status"],
      },
    }];

    const toolName = isGuide ? "guide_question" : "diagnose_error";
    const userText = isGuide
      ? "Walk me through this question step by step with concept and practice problems."
      : "Analyze this student's work: find the error, explain the concept, and generate targeted practice.";

    const data = await callAnthropic({
      system: systemPrompt,
      messages: [{
        role: "user",
        content: text
          ? [{ type: "text", text: `${userText}\n\nQuestion: ${text}` }]
          : [
              { type: "image", source: { type: "base64", media_type: mimeType || "image/png", data: image } },
              { type: "text", text: userText },
            ],
      }],
      tools,
      tool_choice: { type: "tool", name: toolName },
    });

    const toolUse = data.content?.find((block: any) => block.type === "tool_use");
    if (!toolUse) {
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ...toolUse.input, mode }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: unknown) {
    console.error("diagnose-image error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Rate limited") ? 429 : 500;
    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

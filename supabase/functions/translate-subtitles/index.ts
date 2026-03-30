import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const langNames: Record<string, string> = {
  zh: "Chinese (Traditional)",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
  de: "German",
  fr: "French",
};

const BATCH_SIZE = 10;

async function translateBatch(
  batch: { id: number; text: string }[],
  sourceLabel: string,
  targetLabel: string,
  apiKey: string
): Promise<{ id: number; translated: string }[]> {
  const textsToTranslate = batch.map((s) => `[${s.id}] ${s.text}`);

  const prompt = `Translate the following subtitles from ${sourceLabel} to ${targetLabel}. 
Return ONLY a JSON array where each element has "id" (number) and "translated" (string).
Do not add any explanation or markdown formatting.

Subtitles:
${textsToTranslate.join("\n")}`;

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a professional subtitle translator. Return only valid JSON arrays. No markdown, no explanation.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_translations",
              description: "Return the translated subtitles",
              parameters: {
                type: "object",
                properties: {
                  translations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        translated: { type: "string" },
                      },
                      required: ["id", "translated"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["translations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "return_translations" },
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI gateway error:", response.status, errText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error("No tool call in AI response");
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  return parsed.translations;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subtitles, sourceLang, targetLang } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const sourceLabel = langNames[sourceLang] || sourceLang;
    const targetLabel = langNames[targetLang] || targetLang;

    // Process in batches to avoid timeouts
    const allTranslations: { id: number; translated: string }[] = [];
    for (let i = 0; i < subtitles.length; i += BATCH_SIZE) {
      const batch = subtitles.slice(i, i + BATCH_SIZE);
      console.log(`Translating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(subtitles.length / BATCH_SIZE)}`);
      const results = await translateBatch(batch, sourceLabel, targetLabel, LOVABLE_API_KEY);
      allTranslations.push(...results);
    }

    return new Response(JSON.stringify({ translations: allTranslations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Translation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

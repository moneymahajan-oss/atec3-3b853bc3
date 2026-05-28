// supabase/functions/chat/index.ts
// Secure Anthropic API proxy — API key never exposed to browser
// Deploy: supabase functions deploy chat
// Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SYSTEM_PROMPT = `You are ATEC Assistant — a friendly, knowledgeable AI helpbot for ATEC (Avenue To Excellent Careers), Punjab's premier computer education institute located in Gurdaspur.

Your job is to help students, parents, and visitors with:
- Course information (Computer Basics, MS Office, Tally, DTP, Web Design, Programming, Digital Marketing, Hardware & Networking, Financial Accounting, etc.)
- Admission enquiries and fee structure guidance
- Batch timings and schedules
- Certificate and verification questions
- Career guidance related to ATEC courses
- Contact and location information
- Mock test and assessment queries

Key facts about ATEC:
- Full name: Avenue To Excellent Careers
- Location: Gurdaspur, Punjab, India
- Established: Since 2000 (26+ years of excellence)
- Stats: 5,000+ students trained, 20+ courses, 2,000+ placements
- Certifications: ISO 9001:2015 Certified, Authorized Tally Institute
- Speciality: Computer education and IT courses
- Offers both short-term and long-term courses
- Provides industry-recognised certificates
- Has online mock tests students can take for free

Tone guidelines:
- Be warm, encouraging, and professional
- Keep replies concise (2-4 sentences unless the student asks for details)
- Use simple English; occasional Punjabi phrases like "Ji" are fine
- Always end with a clear next step (e.g., "WhatsApp us or fill the enquiry form on our website")
- Never fabricate specific fee amounts, dates, or batch times — say "Please contact us for latest details"
- If you don't know something, say so and suggest contacting ATEC directly

Never discuss competitors, politics, or topics unrelated to ATEC or education.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Forward to Anthropic API
    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001", // Fast + cheap for chatbot use
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: messages.slice(-10), // Last 10 messages for context
        }),
      }
    );

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic error:", errText);
      return new Response(
        JSON.stringify({ error: "AI service error", details: errText }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await anthropicResponse.json();
    const reply = data?.content?.[0]?.text ?? "Sorry, I couldn't respond. Please try again.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

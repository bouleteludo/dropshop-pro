import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY n'est pas configurée sur le serveur." }, { status: 503 });

  try {
    const body = await request.json() as { messages?: ChatMessage[] };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    if (!messages.length) return NextResponse.json({ error: "Aucun message reçu." }, { status: 400 });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        input: [
          {
            role: "system",
            content: "Tu es l'assistant officiel de BOO, boutique française de petits personnages sensoriels et collections saisonnières. Réponds en français, de façon chaleureuse, concise et honnête. Tu peux expliquer les collections Noël, Spooky, Monster, Mystery et Neon Glow. Ne promets jamais une disponibilité, un délai ou une conformité qui n'est pas explicitement fournie.",
          },
          ...messages,
        ],
      }),
      cache: "no-store",
    });

    const data = await response.json();
    if (!response.ok) {
      const detail = typeof data?.error?.message === "string" ? data.error.message : "Erreur OpenAI.";
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    const output = Array.isArray(data.output) ? data.output : [];
    const text = output.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content ?? [])
      .filter((part) => part.type === "output_text" || typeof part.text === "string")
      .map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim();

    return NextResponse.json({ message: text || "Je n'ai pas de réponse pour le moment." });
  } catch {
    return NextResponse.json({ error: "Le service de chat est momentanément indisponible." }, { status: 500 });
  }
}
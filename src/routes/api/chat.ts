import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import type { Database, Json } from "@/integrations/supabase/types";

type ChatRequestBody = {
  messages?: unknown;
  conversationId?: unknown;
};

const SYSTEM_PROMPT = `You are "Nova", the AI customer support agent for Northwind Gear, an online store selling outdoor and travel equipment.

Tone: warm, concise, professional. Short paragraphs. Never invent policies.

Known facts you may rely on:
- Support hours: Mon-Fri 9:00-18:00 GST, weekends 10:00-16:00 GST.
- Free returns within 30 days of delivery, item unused with tags.
- Standard shipping 3-5 business days, express 1-2 business days.
- Warranty: 2 years on backpacks and tents, 1 year on electronics.
- Payment methods: card, Apple Pay, Google Pay, bank transfer for orders over $1,000.

Behaviour rules:
1. Answer the question first, then help with next steps.
2. When the user gives an order number (format like NW-12345), call lookup_order.
3. Whenever the conversation shows buying intent, a quote request, a demo request, or the user shares contact details, call capture_lead to save it. Ask for the missing detail (email or phone) once, politely, then save.
4. If the user is angry, has a complaint you cannot resolve, or asks for a human, call escalate_to_human.
5. Never claim to have emailed, refunded, or shipped anything - you can only look things up, save leads, and escalate.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        const messages = body.messages;
        const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;

        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const supabaseUrl = process.env["SUPABASE_URL"];
        const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const lovableApiKey = process.env["LOVABLE_API_KEY"];

        if (!supabaseUrl || !supabaseKey) {
          return new Response("Backend is not configured", { status: 500 });
        }
        if (!lovableApiKey) {
          return new Response("AI is not configured", { status: 500 });
        }

        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
        if (!token) {
          return new Response("Unauthorized", { status: 401 });
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
          auth: { autoRefreshToken: false, persistSession: false },
          global: { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } },
        });

        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        const user = userData?.user;
        if (userError || !user) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (!conversationId) {
          return new Response("conversationId is required", { status: 400 });
        }

        const { data: conversation } = await supabase
          .from("conversations")
          .select("id")
          .eq("id", conversationId)
          .maybeSingle();

        if (!conversation) {
          return new Response("Conversation not found", { status: 404 });
        }

        const uiMessages = messages as UIMessage[];
        const lastMessage = uiMessages[uiMessages.length - 1];

        const textOf = (message: UIMessage) =>
          (message.parts ?? [])
            .map((part) => (part.type === "text" ? part.text : ""))
            .join("")
            .trim();

        if (lastMessage && lastMessage.role === "user") {
          const { error: insertError } = await supabase.from("messages").insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: "user",
            client_message_id: lastMessage.id ?? null,
            parts: (lastMessage.parts ?? []) as unknown as Json,
            content: textOf(lastMessage),
          });
          if (insertError) {
            console.error("Failed to store user message", insertError);
          }

          const { data: existing } = await supabase
            .from("conversations")
            .select("title")
            .eq("id", conversationId)
            .maybeSingle();

          const firstText = textOf(lastMessage);
          if (existing && existing.title === "New conversation" && firstText) {
            await supabase
              .from("conversations")
              .update({ title: firstText.slice(0, 60) })
              .eq("id", conversationId);
          } else {
            await supabase
              .from("conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", conversationId);
          }
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(lovableApiKey, initialRunId);

        const result = streamText({
          model: gateway("google/gemini-3.7-flash"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(50),
          tools: {
            lookup_order: tool({
              description:
                "Look up the status of a Northwind Gear order by its order number (format NW-12345).",
              inputSchema: z.object({
                order_number: z.string().describe("The order number, e.g. NW-12345"),
              }),
              execute: async ({ order_number }) => {
                const digits = order_number.replace(/\D/g, "");
                if (!digits) {
                  return { found: false, message: "That does not look like a valid order number." };
                }
                const seed = Number(digits.slice(-4) || "0");
                const statuses = [
                  "Preparing for dispatch",
                  "In transit",
                  "Out for delivery",
                  "Delivered",
                ] as const;
                const status = statuses[seed % statuses.length]!;
                const eta = new Date(Date.now() + ((seed % 5) + 1) * 86400000);
                return {
                  found: true,
                  order_number: order_number.toUpperCase(),
                  status,
                  carrier: seed % 2 === 0 ? "DHL Express" : "Aramex",
                  tracking_number: `TRK${digits.padStart(8, "0")}`,
                  estimated_delivery: eta.toISOString().slice(0, 10),
                  items: seed % 3 === 0 ? 1 : 2,
                };
              },
            }),
            capture_lead: tool({
              description:
                "Save a sales lead to the CRM. Call this whenever the customer shows buying intent or shares contact details.",
              inputSchema: z.object({
                name: z.string().nullable().describe("Full name, or null if unknown"),
                email: z.string().nullable().describe("Email address, or null if unknown"),
                phone: z.string().nullable().describe("Phone number, or null if unknown"),
                company: z.string().nullable().describe("Company name, or null if unknown"),
                intent: z.string().describe("Short summary of what the customer wants"),
                notes: z.string().nullable().describe("Any extra useful context"),
              }),
              execute: async (input) => {
                const { data, error } = await supabase
                  .from("leads")
                  .insert({
                    user_id: user.id,
                    conversation_id: conversationId,
                    name: input.name,
                    email: input.email,
                    phone: input.phone,
                    company: input.company,
                    intent: input.intent,
                    notes: input.notes,
                    status: "new",
                  })
                  .select("id")
                  .single();

                if (error) {
                  console.error("Failed to save lead", error);
                  return { saved: false, message: "Could not save the lead right now." };
                }

                return {
                  saved: true,
                  lead_id: data.id,
                  summary: input.intent,
                  contact: input.email ?? input.phone ?? "no contact yet",
                };
              },
            }),
            escalate_to_human: tool({
              description:
                "Escalate the conversation to a human support agent and create a priority ticket.",
              inputSchema: z.object({
                reason: z.string().describe("Why the conversation needs a human"),
                priority: z.enum(["low", "normal", "high"]),
              }),
              execute: async ({ reason, priority }) => {
                const ticket = `TCK-${Math.floor(100000 + Math.random() * 899999)}`;
                await supabase.from("leads").insert({
                  user_id: user.id,
                  conversation_id: conversationId,
                  intent: "Escalation to human agent",
                  notes: reason,
                  status: "escalated",
                });
                return {
                  ticket_id: ticket,
                  priority,
                  queue: priority === "high" ? "Priority queue" : "Standard queue",
                  response_time: priority === "high" ? "under 1 hour" : "within 4 business hours",
                };
              },
            }),
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
          onFinish: async ({ responseMessage }) => {
            if (!responseMessage) return;
            const { error } = await supabase.from("messages").insert({
              conversation_id: conversationId,
              user_id: user.id,
              role: "assistant",
              client_message_id: responseMessage.id ?? null,
              parts: (responseMessage.parts ?? []) as unknown as Json,
              content: textOf(responseMessage),
            });
            if (error) {
              console.error("Failed to store assistant message", error);
            }
          },
        });
      },
    },
  },
});

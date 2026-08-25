import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PackageSearch, UserPlus, LifeBuoy, Wrench } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { supabase } from "@/integrations/supabase/client";
import novaAvatar from "@/assets/nova-avatar.png";

const SUGGESTIONS = [
  "Where is my order NW-48213?",
  "What's your return policy?",
  "I'd like a quote for 25 backpacks for my company",
  "This is the third time I'm asking — I want a human",
];

const TOOL_ICONS: Record<string, typeof Wrench> = {
  lookup_order: PackageSearch,
  capture_lead: UserPlus,
  escalate_to_human: LifeBuoy,
};

export function ChatWindow({
  conversationId,
  initialMessages,
  onActivity,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  onActivity?: () => void;
}) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: async ({ messages: outgoing }) => {
        const { data } = await supabase.auth.getSession();
        return {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session?.access_token ?? ""}`,
          },
          body: { messages: outgoing, conversationId },
        };
      },
    }),
    onFinish: () => onActivity?.(),
    onError: (chatError) => {
      toast.error(chatError.message || "The assistant could not reply. Please try again.");
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversationId]);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    await sendMessage({ text: trimmed });
    onActivity?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-lg pt-10 text-center">
              <img
                src={novaAvatar}
                alt="Nova, the AI support agent"
                className="mx-auto size-16 rounded-2xl"
              />
              <h2 className="mt-5 text-2xl font-bold">Nova is online</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Northwind Gear's AI support agent. It answers policy questions, tracks orders,
                captures leads and escalates to a human when needed.
              </p>
              <div className="mt-6 grid gap-2 text-left">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-lg border border-border bg-surface-2/60 px-4 py-3 text-sm transition-colors hover:border-primary hover:bg-surface-2"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <MessageResponse key={`${message.id}-text-${index}`}>
                        {part.text}
                      </MessageResponse>
                    );
                  }
                  if (part.type.startsWith("tool-")) {
                    const toolName = part.type.replace("tool-", "");
                    const Icon = TOOL_ICONS[toolName] ?? Wrench;
                    void Icon;
                    const toolPart = part as unknown as {
                      type: `tool-${string}`;
                      state: "input-streaming" | "input-available" | "output-available" | "output-error";
                      input?: unknown;
                      output?: unknown;
                      errorText?: string;
                    };
                    return (
                      <Tool key={`${message.id}-tool-${index}`} defaultOpen={false} className="my-2">
                        <ToolHeader
                          type={toolPart.type}
                          state={toolPart.state}
                        />
                        <ToolContent>
                          <ToolInput input={toolPart.input} />
                          <ToolOutput
                            output={
                              toolPart.output ? (
                                <pre className="overflow-x-auto text-xs">
                                  {JSON.stringify(toolPart.output, null, 2)}
                                </pre>
                              ) : undefined
                            }
                            errorText={toolPart.errorText}
                          />
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" ? (
            <Shimmer className="text-sm">Nova is thinking...</Shimmer>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive">
              {error.message || "Something went wrong talking to the assistant."}
            </p>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-surface/60 px-4 py-4">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput
            onSubmit={(_message, event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about an order, a policy, or request a quote..."
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={!input.trim() || busy} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

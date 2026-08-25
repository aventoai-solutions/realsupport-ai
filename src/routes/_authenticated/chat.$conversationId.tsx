import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { ChatWindow } from "@/components/chat/ChatWindow";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
  head: () => ({
    meta: [
      { title: "Conversation — Nova AI Support Console" },
      {
        name: "description",
        content:
          "A live AI customer support conversation with order lookups, automatic lead capture and human escalation.",
      },
      { property: "og:title", content: "Conversation — Nova AI Support Console" },
      {
        property: "og:description",
        content: "Live AI support conversation with tool calls you can inspect.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConversationPage,
});

type MessageRow = {
  id: string;
  role: string;
  parts: unknown;
  content: string;
  created_at: string;
};

function ConversationPage() {
  const { conversationId } = useParams({ from: "/_authenticated/chat/$conversationId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const threads = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const history = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, role, parts, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as MessageRow[]).map<UIMessage>((row) => ({
        id: row.id,
        role: row.role as UIMessage["role"],
        parts: (Array.isArray(row.parts) && row.parts.length > 0
          ? row.parts
          : [{ type: "text", text: row.content }]) as UIMessage["parts"],
      }));
    },
  });

  const newConversation = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Could not start a new conversation.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    navigate({ to: "/chat/$conversationId", params: { conversationId: data.id } });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete that conversation.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    if (id === conversationId) navigate({ to: "/chat" });
  };

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="p-3">
          <Button className="w-full" onClick={() => void newConversation()}>
            <Plus className="size-4" /> New conversation
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {(threads.data ?? []).map((thread) => {
            const active = thread.id === conversationId;
            return (
              <div
                key={thread.id}
                className={`group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                  active ? "bg-primary/15" : "hover:bg-surface-2"
                }`}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() =>
                    navigate({
                      to: "/chat/$conversationId",
                      params: { conversationId: thread.id },
                    })
                  }
                >
                  <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{thread.title}</span>
                </button>
                <button
                  type="button"
                  aria-label="Delete conversation"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => void remove(thread.id)}
                >
                  <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {history.isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading conversation...
          </div>
        ) : (
          <ChatWindow
            key={conversationId}
            conversationId={conversationId}
            initialMessages={history.data ?? []}
            onActivity={() => {
              void queryClient.invalidateQueries({ queryKey: ["conversations"] });
              void queryClient.invalidateQueries({ queryKey: ["leads"] });
            }}
          />
        )}
      </section>
    </div>
  );
}

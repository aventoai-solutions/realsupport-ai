import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Live AI chat — Nova Support Console" },
      {
        name: "description",
        content:
          "Chat with Nova, an AI customer support agent that answers questions, tracks orders and captures leads automatically.",
      },
      { property: "og:title", content: "Live AI chat — Nova Support Console" },
      {
        property: "og:description",
        content: "A working AI customer support agent with live order lookups and lead capture.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!user || bootstrapped.current) return;
    bootstrapped.current = true;

    const run = async () => {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1);

      const found = existing?.[0]?.id;
      if (found) {
        navigate({ to: "/chat/$conversationId", params: { conversationId: found } });
        return;
      }

      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id })
        .select("id")
        .single();

      if (error || !data) {
        toast.error("Could not start a conversation.");
        return;
      }
      navigate({ to: "/chat/$conversationId", params: { conversationId: data.id } });
    };

    void run();
  }, [user, navigate]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Opening your conversation...
    </div>
  );
}

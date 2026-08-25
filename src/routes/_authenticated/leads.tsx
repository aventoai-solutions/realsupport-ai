import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Lead inbox — Nova AI Support Console" },
      {
        name: "description",
        content:
          "Every lead the AI support agent captured from live conversations: contact details, intent and escalations.",
      },
      { property: "og:title", content: "Lead inbox — Nova AI Support Console" },
      {
        property: "og:description",
        content: "Leads captured automatically by the AI customer support agent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const leads = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow text-primary">Captured automatically</p>
          <h1 className="mt-2 text-3xl font-bold">Lead inbox</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Nova writes a lead here the moment a conversation shows buying intent or gets escalated.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {leads.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading leads...</p>
        ) : null}

        {!leads.isLoading && (leads.data?.length ?? 0) === 0 ? (
          <div className="panel flex flex-col items-center gap-3 p-12 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="font-medium">No leads yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Open the live chat and ask for a quote — Nova will capture the lead and it will appear
              here instantly.
            </p>
          </div>
        ) : null}

        {(leads.data ?? []).map((lead) => (
          <article key={lead.id} className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{lead.name ?? "Unnamed contact"}</h2>
              <Badge variant={lead.status === "escalated" ? "destructive" : "secondary"}>
                {lead.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{lead.intent}</p>
            <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {lead.email ? (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{lead.email}</dd>
                </div>
              ) : null}
              {lead.phone ? (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{lead.phone}</dd>
                </div>
              ) : null}
              {lead.company ? (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Company</dt>
                  <dd>{lead.company}</dd>
                </div>
              ) : null}
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Captured</dt>
                <dd>{new Date(lead.created_at).toLocaleString()}</dd>
              </div>
            </dl>
            {lead.notes ? (
              <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
                {lead.notes}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

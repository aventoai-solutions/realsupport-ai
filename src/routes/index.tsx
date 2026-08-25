import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  MessagesSquare,
  PackageSearch,
  UserPlus,
  LifeBuoy,
  ShieldCheck,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import consolePreview from "@/assets/console-preview.jpg";
import novaAvatar from "@/assets/nova-avatar.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova — AI Customer Support That Actually Resolves Tickets" },
      {
        name: "description",
        content:
          "Nova is a live AI support agent: it answers policy questions, looks up orders, captures qualified leads and hands off to humans.",
      },
      { property: "og:title", content: "Nova — AI Customer Support Agent" },
      {
        property: "og:description",
        content:
          "Live AI support with order lookups, automatic lead capture and human escalation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const CAPABILITIES = [
  {
    icon: MessagesSquare,
    title: "Answers from your policy base",
    body: "Shipping, returns, warranty and payment questions answered with the exact terms your team wrote — no hallucinated policies.",
  },
  {
    icon: PackageSearch,
    title: "Live order lookups",
    body: "Nova calls an order tool mid-conversation and returns real status, carrier and delivery estimates you can inspect.",
  },
  {
    icon: UserPlus,
    title: "Automatic lead capture",
    body: "Buying intent triggers a structured lead — name, company, email and context — written straight to your inbox.",
  },
  {
    icon: LifeBuoy,
    title: "Human escalation",
    body: "Frustration, refunds or anything off-script gets flagged and routed to a person with the full transcript attached.",
  },
];

const STATS = [
  { value: "68%", label: "tickets resolved without a human" },
  { value: "12s", label: "median first response" },
  { value: "24/7", label: "coverage across channels" },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <span className="flex items-center gap-2 font-display text-base font-bold">
            <img src={novaAvatar} alt="" width={28} height={28} className="size-7" />
            Nova
          </span>
          <Link to="/auth">
            <Button variant="outline" size="sm">
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20">
          <p className="eyebrow text-primary">AI automation · Chatbot · CRM integration</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.1] sm:text-6xl">
            AI customer support that closes the ticket, not the conversation.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Nova handles the front line for Northwind Gear: it answers policy questions, pulls live
            order status, captures qualified leads into the CRM and escalates to a human the moment
            it should.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg">
                Try the live agent
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline">
                View the lead inbox
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-8">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="panel mt-14 overflow-hidden p-2">
            <img
              src={consolePreview}
              alt="The Nova support console showing a live conversation, an order lookup tool call and a captured lead"
              width={1536}
              height={960}
              className="w-full rounded-lg"
            />
          </div>
        </section>

        <section className="border-t border-border/60 bg-surface/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-20">
            <h2 className="font-display text-3xl font-bold">What the agent actually does</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {CAPABILITIES.map((item) => (
                <article key={item.title} className="panel p-6">
                  <item.icon className="size-5 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="panel flex flex-col items-start gap-6 p-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">See it work on a real conversation</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Create an account, ask about order NW-48213 or request a bulk quote, and watch the
                tool calls and captured leads appear in real time.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" /> Private per-account data
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" /> Conversations saved and resumable
                </span>
              </div>
            </div>
            <Link to="/auth">
              <Button size="lg">
                Start chatting
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Nova — AI customer support demo for Northwind Gear.
      </footer>
    </div>
  );
}

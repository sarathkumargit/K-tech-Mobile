import { createFileRoute, Link } from "@tanstack/react-router";
import { Smartphone, Wrench, ShieldCheck, Tag, Users, Award } from "lucide-react";
import { useRepair } from "@/components/repair-context";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — K-Tech" },
      {
        name: "description",
        content:
          "K-Tech is your trusted local mobile phone shop — brand new & used phones, accessories, and expert repairs.",
      },
      { property: "og:title", content: "About Us — K-Tech" },
      {
        property: "og:description",
        content: "Your trusted local mobile phone shop — phones, accessories, and repairs.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { open: openRepair } = useRepair();
  return (
    <div>
      <section className="bg-gradient-to-br from-cozy-peach to-cozy-light-peach">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-widest text-cozy-burnt">
            Our Story
          </span>
          <h1 className="mt-3 font-display text-5xl tracking-tight text-foreground sm:text-6xl">
            Your Trusted Mobile Shop
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-foreground/75">
            K-Tech started with one goal: make reliable phones, genuine accessories, and honest
            repairs accessible to everyone. Whether you want the latest flagship, a tested pre-owned
            phone, or a quick screen fix — we've got you covered.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Smartphone,
              title: "Phones for Everyone",
              desc: "Brand new & used phones at every budget.",
            },
            {
              icon: Tag,
              title: "Best Prices",
              desc: "Competitive prices and daily deals you can trust.",
            },
            {
              icon: Wrench,
              title: "Expert Repairs",
              desc: "Same-day fixes by trained technicians.",
            },
            {
              icon: ShieldCheck,
              title: "Genuine Warranty",
              desc: "Warranty on devices and accessories.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary/40 py-12">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="font-display text-3xl tracking-tight text-foreground">
              Why Customers Trust K-Tech
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Every used phone is fully tested, battery-checked, and reset to factory settings
              before it hits our shelves. Every repair is done with genuine parts and backed by our
              service warranty. We believe in honest advice — if a repair isn't worth it, we'll tell
              you.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { stat: "5k+", label: "Phones sold" },
                { stat: "3mo", label: "Used-phone warranty" },
                { stat: "Same-day", label: "Most repairs" },
              ].map(({ stat, label }) => (
                <div key={label}>
                  <p className="font-display text-3xl text-primary">{stat}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-cozy-orange to-cozy-burnt p-8 text-primary-foreground">
            <h3 className="font-display text-2xl tracking-tight">Our Promise</h3>
            <p className="mt-2 text-sm text-primary-foreground/85">
              Genuine products, fair prices, and repairs that last. If something isn't right, we'll
              make it right — that's the K-Tech guarantee.
            </p>
            <button
              onClick={openRepair}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-5 py-2.5 text-sm font-semibold text-cozy-burnt transition-transform hover:scale-105"
            >
              <Wrench className="h-4 w-4" />
              Book a Repair
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

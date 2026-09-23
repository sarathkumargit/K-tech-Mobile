import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, MessageCircle, Wrench } from "lucide-react";
import { toast } from "sonner";

import { useRepair } from "@/components/repair-context";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { whatsappLink } from "@/lib/site-config";
import { LoadingState } from "@/components/states";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — K-Tech" },
      {
        name: "description",
        content:
          "Get in touch with K-Tech. Visit our shop, call, or message us on WhatsApp for phones, accessories, and repairs.",
      },
      { property: "og:title", content: "Contact Us — K-Tech" },
      {
        property: "og:description",
        content: "Get in touch with K-Tech for phones, accessories, and repairs.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { settings } = useSiteSettings();
  const whatsapp = whatsappLink(settings?.whatsapp_number);
  const { open: openRepair } = useRepair();
  return (
    <div>
      <section className="bg-gradient-to-br from-cozy-peach to-cozy-light-peach">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-widest text-cozy-burnt">
            We're Here to Help
          </span>
          <h1 className="mt-3 font-display text-5xl tracking-tight text-foreground sm:text-6xl">
            Get in Touch
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-foreground/75">
            Questions about a phone, an order, or a repair? Reach out — our team responds fast.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Contact info */}
          <div>
            <h2 className="font-display text-2xl tracking-tight text-foreground">
              Contact Details
            </h2>
            <div className="mt-5 space-y-3">
              {!settings && <LoadingState label="Loading contact details…" className="py-8" />}
              {(settings
                ? [
                    {
                      icon: Phone,
                      label: "Call / SMS",
                      value: settings.phone,
                      href: `tel:${settings.phone.replace(/\s+/g, "")}`,
                    },
                    ...(whatsapp
                      ? [
                          {
                            icon: MessageCircle,
                            label: "WhatsApp",
                            value: "Chat with us",
                            href: whatsapp,
                          },
                        ]
                      : []),
                    {
                      icon: Mail,
                      label: "Email",
                      value: settings.email,
                      href: `mailto:${settings.email}`,
                    },
                    { icon: MapPin, label: "Visit Shop", value: settings.address, href: undefined },
                  ]
                : []
              ).map(({ icon: Icon, label, value, href }) => {
                const inner = (
                  <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <p className="font-medium text-foreground">{value}</p>
                    </div>
                  </div>
                );
                return href ? (
                  <a key={label} href={href} target="_blank" rel="noreferrer" className="block">
                    {inner}
                  </a>
                ) : (
                  <div key={label}>{inner}</div>
                );
              })}
            </div>

            <button
              onClick={openRepair}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cozy-burnt px-6 py-3.5 font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              <Wrench className="h-5 w-5" />
              Book a Phone Repair
            </button>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
            <h2 className="font-display text-2xl tracking-tight text-foreground">Send a Message</h2>
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const text = `Hi ${settings?.shop_name ?? "K-Tech"}, I'm ${data.get("name")} (${data.get("phone")}).\n\n*${data.get("subject")}*\n${data.get("message")}`;
                const link = whatsappLink(settings?.whatsapp_number, text);
                if (!link) {
                  toast.error("Our WhatsApp number isn't set up yet — please call or email us.");
                  return;
                }
                window.open(link, "_blank", "noopener");
                e.currentTarget.reset();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
                  <input
                    required
                    name="name"
                    type="text"
                    placeholder="Your name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Phone</label>
                  <input
                    required
                    name="phone"
                    type="tel"
                    placeholder="Your phone number"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Subject</label>
                <input
                  required
                  name="subject"
                  type="text"
                  placeholder="How can we help?"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Message</label>
                <textarea
                  required
                  name="message"
                  rows={5}
                  placeholder="Tell us more..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-cozy-burnt"
              >
                Send via WhatsApp
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/25";

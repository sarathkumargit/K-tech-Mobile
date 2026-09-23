import { Link } from "@tanstack/react-router";
import { MessageCircle, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRepair } from "@/components/repair-context";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { isSupabaseConfigured } from "@/lib/supabase";
import { qk } from "@/lib/query-keys";
import { whatsappLink } from "@/lib/site-config";
import { getCategories } from "@/services/categoryService";

export function Footer() {
  const { settings } = useSiteSettings();
  const categories = useQuery({
    queryKey: qk.categories,
    queryFn: getCategories,
    enabled: isSupabaseConfigured,
  });
  const whatsapp = whatsappLink(settings?.whatsapp_number);
  const { open: openRepair } = useRepair();
  return (
    <footer className="border-t border-border bg-cozy-burnt text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cozy-orange to-cozy-light-peach">
                <span className="font-display text-lg text-primary-foreground">K</span>
              </div>
              <span className="font-display text-2xl tracking-tight">K-TECH</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-primary-foreground/75">
              Your trusted mobile phone shop. Brand new phones, used phones, accessories, and expert
              repairs — all in one place.
            </p>
          </div>

          <div>
            <h3 className="font-display text-base">Shop</h3>
            <ul className="mt-3 space-y-2 text-sm text-primary-foreground/75">
              <li>
                <Link
                  to="/shop"
                  search={{ category: "offers" }}
                  className="hover:text-cozy-light-peach"
                >
                  Offers &amp; Deals
                </Link>
              </li>
              {categories.data?.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <Link
                    to="/shop"
                    search={{ category: cat.slug }}
                    className="hover:text-cozy-light-peach"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-base">Company</h3>
            <ul className="mt-3 space-y-2 text-sm text-primary-foreground/75">
              <li>
                <Link to="/about" className="hover:text-cozy-light-peach">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-cozy-light-peach">
                  Contact
                </Link>
              </li>
              <li>
                <button onClick={openRepair} className="hover:text-cozy-light-peach">
                  Phone Repair
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-base">Connect</h3>
            {settings && (
              <>
                <p className="mt-3 text-sm text-primary-foreground/75">{settings.address}</p>
                <p className="mt-1 text-sm text-primary-foreground/75">{settings.phone}</p>
                <p className="mt-1 text-sm text-primary-foreground/75">{settings.email}</p>
              </>
            )}
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-cozy-orange"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp us
              </a>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-primary-foreground/15 pt-6 text-sm text-primary-foreground/60 sm:flex-row">
          <span>
            © {new Date().getFullYear()} {settings?.shop_name ?? "K-Tech"}. All rights reserved.
          </span>
          <button
            onClick={openRepair}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-cozy-orange"
          >
            <Wrench className="h-3.5 w-3.5" />
            Book a Repair
          </button>
        </div>
      </div>
    </footer>
  );
}

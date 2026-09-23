import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Wrench,
  Flame,
  Tag,
  LayoutGrid,
} from "lucide-react";
import { ProductCard, ProductGridSkeleton, ProductImage } from "@/components/product-card";
import { ProductPrice, discountPercent } from "@/components/product-price";
import { CountdownTimer } from "@/components/countdown-timer";
import { EmptyState, ErrorState } from "@/components/states";
import { useRepair } from "@/components/repair-context";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { qk } from "@/lib/query-keys";
import { getCategories } from "@/services/categoryService";
import { getFeaturedProducts, getOfferProducts, type Product } from "@/services/productService";

const HERO_IMAGE =
  "https://vibe.filesafe.space/1790084348979734783/assets/15d93eef-8043-4c34-bb25-ce6d12e12ba3.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "K-Tech — Mobile Phones, Accessories & Repairs" },
      {
        name: "description",
        content:
          "Shop brand new & used phones, accessories, chargers, and book expert phone repairs at K-Tech. Best deals and offers every day.",
      },
      { property: "og:title", content: "K-Tech — Mobile Phones, Accessories & Repairs" },
      {
        property: "og:description",
        content: "Brand new & used phones, accessories, and expert repairs at K-Tech.",
      },
      { property: "og:image", content: HERO_IMAGE },
      { name: "twitter:image", content: HERO_IMAGE },
    ],
  }),
  component: Index,
});

function Index() {
  const { open: openRepair } = useRepair();
  const { settings } = useSiteSettings();
  const categories = useQuery({ queryKey: qk.categories, queryFn: getCategories });
  const featured = useQuery({ queryKey: qk.featured, queryFn: () => getFeaturedProducts(8) });
  const offers = useQuery({ queryKey: qk.offers, queryFn: () => getOfferProducts(12) });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cozy-peach via-cozy-light-peach to-cozy-orange">
        <div className="hero-glow absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cozy-burnt/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-cozy-burnt">
              <Flame className="h-3.5 w-3.5" />
              {offers.data && offers.data.length > 0
                ? `${offers.data.length} offer${offers.data.length === 1 ? "" : "s"} live now`
                : "Phones · Accessories · Repairs"}
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Your Trusted
              <br />
              Mobile Phone Shop
            </h1>
            <p className="mt-5 max-w-md text-base text-foreground/75 sm:text-lg">
              Brand new &amp; used phones, accessories, and expert repairs — all under one roof.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:scale-105"
              >
                Shop Now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={openRepair}
                className="inline-flex items-center gap-2 rounded-xl border border-cozy-burnt/40 bg-card/70 px-6 py-3 font-semibold text-cozy-burnt transition-colors hover:bg-card"
              >
                <Wrench className="h-4 w-4" />
                Book a Repair
              </button>
            </div>
          </div>

          <div className="relative">
            <img
              src={HERO_IMAGE}
              alt="Phones and accessories at K-Tech"
              className="w-full rounded-3xl object-cover shadow-2xl shadow-cozy-burnt/20"
            />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            { icon: Truck, title: "Fast Delivery", desc: "Across the city" },
            { icon: ShieldCheck, title: "Genuine Warranty", desc: "On all devices" },
            { icon: RotateCcw, title: "7-Day Returns", desc: "Hassle-free" },
            { icon: Wrench, title: "Expert Repairs", desc: "Same-day service" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-sm text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories (from the categories table) */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader title="Shop by Category" subtitle="Find exactly what you're looking for." />
        <div className="mt-6">
          {categories.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-secondary/60" />
              ))}
            </div>
          ) : categories.error ? (
            <ErrorState
              error={categories.error}
              title="Couldn't load categories"
              onRetry={() => categories.refetch()}
            />
          ) : categories.data && categories.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <CategoryTile
                to="Offers"
                label="Offers"
                desc="Limited-time deals"
                icon={<Tag className="h-7 w-7" />}
              />
              {categories.data.map((cat) => (
                <CategoryTile
                  key={cat.id}
                  to={cat.slug}
                  label={cat.name}
                  desc={cat.description}
                  image={cat.image_url}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No categories yet"
              description="Categories added in the admin panel appear here."
            />
          )}
        </div>
      </section>

      {/* Offers */}
      {offers.data && offers.data.length > 0 && (
        <section className="bg-gradient-to-br from-cozy-burnt to-cozy-deep-orange py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary-foreground">
                  <Flame className="h-3.5 w-3.5" />
                  Hot Deals
                </span>
                <h2 className="mt-3 font-display text-3xl tracking-tight text-primary-foreground">
                  Offers &amp; Deals
                </h2>
                <p className="mt-1 text-sm text-primary-foreground/75">Hurry — these end soon!</p>
              </div>
              <Link
                to="/shop"
                search={{ category: "offers" }}
                className="hidden items-center gap-1 text-sm font-semibold text-primary-foreground hover:underline sm:flex"
              >
                All Offers <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="no-scrollbar mt-6 flex gap-4 overflow-x-auto pb-2">
              {offers.data.map((product) => (
                <div key={product.id} className="w-64 shrink-0">
                  <OfferCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader
          title="Featured Products"
          subtitle="Hand-picked phones and accessories."
          link={{ label: "View All", to: "/shop" }}
        />
        <div className="mt-6">
          {featured.isLoading ? (
            <ProductGridSkeleton count={4} />
          ) : featured.error ? (
            <ErrorState
              error={featured.error}
              title="Couldn't load products"
              onRetry={() => featured.refetch()}
            />
          ) : featured.data && featured.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {featured.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No products available yet"
              description="Products added in the admin panel will show up here."
            />
          )}
        </div>
      </section>

      {/* Repair CTA */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-cozy-orange/30 bg-gradient-to-br from-cozy-peach to-cozy-light-peach px-6 py-10 sm:px-12">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
                Phone Broken? We Fix It.
              </h2>
              <p className="mt-2 max-w-lg text-sm text-foreground/75">
                Screen replacement, battery, charging port, water damage — our technicians handle it
                all. Submit a repair request and we'll get back to you fast.
              </p>
            </div>
            <button
              onClick={openRepair}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cozy-burnt px-7 py-3.5 font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              <Wrench className="h-5 w-5" />
              Book a Repair
            </button>
          </div>
        </div>
      </section>

      {/* Contact strip (site_settings) */}
      {settings && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <ContactTile label="Call us" value={settings.phone} />
            <ContactTile label="Visit" value={settings.address} />
            <ContactTile label="Email" value={settings.email} />
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  link,
}: {
  title: string;
  subtitle: string;
  link?: { label: string; to: "/shop" };
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="font-display text-3xl tracking-tight text-foreground">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {link && (
        <Link
          to={link.to}
          className="hidden items-center gap-1 text-sm font-semibold text-primary hover:text-cozy-burnt sm:flex"
        >
          {link.label} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function CategoryTile({
  to,
  label,
  desc,
  image,
  icon,
}: {
  to: string;
  label: string;
  desc?: string | null;
  image?: string | null;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      to="/shop"
      search={{ category: to === "Offers" ? "offers" : to }}
      className="group flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-5 text-center transition-all hover:-translate-y-1 hover:border-accent hover:shadow-md"
    >
      {image ? (
        <img src={image} alt="" className="h-10 w-10 rounded-lg object-cover" />
      ) : (
        <span className="text-primary">{icon ?? <LayoutGrid className="h-7 w-7" />}</span>
      )}
      <span className="mt-2 font-display text-sm leading-tight text-foreground transition-colors group-hover:text-primary">
        {label}
      </span>
      {desc && (
        <span className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{desc}</span>
      )}
    </Link>
  );
}

function ContactTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-base text-foreground">{value}</p>
    </div>
  );
}

function OfferCard({ product }: { product: Product }) {
  const discount = discountPercent(product);
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary/40">
        <ProductImage src={product.image_url} alt={product.name} />
        {discount > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-cozy-burnt px-2.5 py-1 text-[10px] font-bold uppercase text-primary-foreground">
            {discount}% OFF
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        {product.offer_title && (
          <p className="text-[11px] font-bold uppercase tracking-wide text-cozy-burnt">
            {product.offer_title}
          </p>
        )}
        <h3 className="mt-0.5 font-display text-base leading-tight text-foreground">
          {product.name}
        </h3>
        <ProductPrice product={product} className="mt-2" />
        {product.offer_end_date && (
          <div className="mt-auto pt-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-cozy-burnt">
              Offer Ends In
            </p>
            <CountdownTimer end={product.offer_end_date} compact />
          </div>
        )}
      </div>
    </Link>
  );
}

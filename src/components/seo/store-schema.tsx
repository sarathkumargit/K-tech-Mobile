// Tells Google who the shop is (name, phone, email, address, logo) in the
// schema.org format it reads for business details. Shown on the home page.
// The details come from Admin → Settings, so they stay in sync automatically.
import { useSiteSettings } from "@/hooks/use-site-settings";
import { CURRENCY_CODE, DEFAULT_SHARE_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

export function StoreSchema() {
  const { settings } = useSiteSettings();
  if (!settings) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "MobilePhoneStore",
    "@id": `${SITE_URL}/#store`,
    name: settings.shop_name || SITE_NAME,
    url: `${SITE_URL}/`,
    logo: absoluteUrl("/icon-512.png"),
    image: absoluteUrl(DEFAULT_SHARE_IMAGE),
    telephone: settings.phone || undefined,
    email: settings.email || undefined,
    currenciesAccepted: CURRENCY_CODE,
    address: settings.address
      ? { "@type": "PostalAddress", streetAddress: settings.address, addressCountry: "LK" }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      // JSON only; "<" is escaped so the text can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

import React, { useEffect, useMemo, useState } from "react";

// =========================
// VAPLUS AU Storefront (Apple-like catalog → Telegram order)
// Full rewrite to fix stray tokens, undefined identifiers, and mismatched imports.
// Includes: i18n (EN/ZH), AgeGate, Featured best-seller hero, products grid,
// advantages, shipping estimator, testimonials, Telegram deep-link, and runtime tests.
// =========================

// ---- Constants & Config ----
const TG_BOT = "LusmindSupportBot"; // If you have a bot: t.me/LusmindSupportBot
const TG_USER = "lusmind_orders";   // Fallback: user/handle
const LEAD_ENDPOINT = "/api/lead";  // sendBeacon placeholder
const CURRENCY = "AUD" as const;
const LOCALE = "en-AU" as const;     // Default to Australia locale
const GST = 0.1;                      // Australia GST 10%

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
const LANGS = ["en", "zh"] as const;
type Lang = typeof LANGS[number];

// ---- Types ----
type Product = {
  id: string;
  name: string; // canonical
  nameEn?: string;
  nameZh?: string;
  description: string; // canonical
  descriptionEn?: string;
  descriptionZh?: string;
  price: number;
  currency: string;
  image: string;
  variants: { id: string; name: string; nameEn?: string; nameZh?: string }[];
  category: "Fruity" | "Dessert" | "Menthol";
  strength: "3%" | "5%";
  rating: number;
  reviews: number;
  createdAt: number;
  badge?: "BEST" | "POPULAR" | "NEW";
};

// ---- i18n ----
const T: Record<Lang, any> = {
  en: {
    brand: "VAPLUS",
    storeTagline: "Store. The best way to buy VAPLUS.",
    searchPlaceholder: "Search products",
    btnOrder: "Order via Telegram", // keep for test stability
    from: "From",
    inclGST: "incl. GST",
    policyTitle: "Australia Shipping & Compliance (AU)",
    policyPara:
      "Prices shown are consumer prices including GST. Availability and shipping methods depend on destination regulations and logistics reach.",
    policyBullets: [
      "GST inclusive by default; tax invoices on request.",
      "Remote areas/states may incur surcharges or longer transit times.",
      "We only serve legal and reachable destinations.",
    ],
    stateLabel: "State / Territory",
    postcodeLabel: "Postcode",
    estimateLabel: "Estimate",
    shippingLabel: "Shipping",
    etaLabel: "ETA",
    zoneLabel: "Zone",
    shippingHint:
      "Estimates are indicative; final cost/time will be confirmed by our Telegram agent.",
    ageTitle: "Adults only (18+)",
    ageText:
      "This website is intended for adult customers in Australia. By continuing, you confirm you are 18 or older.",
    ageYes: "I am 18+",
    ageNo: "I am under 18",
    ageUnder: "If you are under 18, please leave this site.",
    mobileCTA: "Message our Telegram agent",
    orderHeader: "Order intent",
    orderProduct: "Product",
    orderVariant: "Variant",
    orderQty: "Qty",
    orderUnitPrice: "Unit price",
    orderSubtotalEx: "Subtotal (excl. shipping/tax)",
    orderSource: "Source",
    orderSession: "Session ID",
    nav: { store: "Store", products: "Products", support: "Support" },
    bestSeller: "Best seller",
    footerRights: "All rights reserved.",
    testimonialsTitle: "What our customers say",
    ratingWord: "EXCELLENT",
    basedOn: "Based on",
    reviewsWord: "reviews",
    advTitle: "Our advantages",
    whyTitle: "Why choose us?",
    advItems: {
      deliverAU: { title: "Australia-wide delivery", desc: "Fast, reliable shipping nationwide." },
      competitivePrice: { title: "Competitive pricing", desc: "Transparent AUD pricing incl. GST." },
      genuine: { title: "100% genuine", desc: "Authentic products, verified supply." },
    },
    vardexIntro: "Vardex vape store offers:",
    vardexLine: "Direct shipping from official representatives.",
    vardexDetail:
      "We offer leading disposable vape brands including IGET Vape, ALIBARBAR Vape, RELX Vape and many more—trusted by tens of thousands of loyal customers. With vape stores in Sydney, Melbourne, Brisbane, we offer fast, reliable delivery and a smooth online shopping experience.",
  },
  zh: {
    brand: "VAPLUS",
    storeTagline: "商店。购买 VAPLUS 的最佳方式。",
    searchPlaceholder: "搜索产品",
    btnOrder: "下单",
    from: "起",
    inclGST: "含 GST",
    policyTitle: "澳大利亚配送与合规（AU）",
    policyPara:
      "页面价格默认为含 GST 的消费者价格。是否可售和配送方式取决于目的地法规与物流可达性。",
    policyBullets: [
      "默认含 GST；如需税务发票可向客服索取。",
      "偏远地区/州可能有附加费或更长时效。",
      "仅在合法且可达的前提下提供服务。",
    ],
    stateLabel: "州 / 领地",
    postcodeLabel: "邮编",
    estimateLabel: "试算",
    shippingLabel: "运费",
    etaLabel: "时效",
    zoneLabel: "分区",
    shippingHint: "试算仅供参考，最终费用/时效以客服确认为准。",
    ageTitle: "仅限成年人 (18+)",
    ageText: "本网站面向澳大利亚合法成年人消费者。继续访问即表示您已年满 18 岁。",
    ageYes: "我已年满 18 岁",
    ageNo: "我未满 18 岁",
    ageUnder: "未满 18 岁请离开本网站。",
    mobileCTA: "一键联系 Telegram 客服",
    orderHeader: "【下单意向】",
    orderProduct: "产品",
    orderVariant: "规格",
    orderQty: "数量",
    orderUnitPrice: "单价",
    orderSubtotalEx: "小计（未含运费/税）",
    orderSource: "来源",
    orderSession: "会话ID",
    nav: { store: "商店", products: "产品", support: "支持" },
    bestSeller: "最畅销",
    footerRights: "保留所有权利。",
    testimonialsTitle: "用户评价",
    ratingWord: "极好",
    basedOn: "基于",
    reviewsWord: "条评价",
    advTitle: "我们的优势",
    whyTitle: "为什么选择我们？",
    advItems: {
      deliverAU: { title: "全澳配送", desc: "全国范围快速、可靠派送。" },
      competitivePrice: { title: "有竞争力的价格", desc: "澳元透明标价，默认含 GST。" },
      genuine: { title: "正品保证", desc: "官方正品，渠道可核验。" },
    },
    vardexIntro: "Vardex电子烟商店提供：",
    vardexLine: "官方代表直接发货，",
    vardexDetail:
      "我们提供领先的一次性电子烟品牌，包括 IGET Vape、ALIBARBAR Vape、RELX Vape 等，获得数万名忠实客户信赖。我们在悉尼、墨尔本、布里斯班设有门店，提供快速可靠的配送与顺畅的线上购物体验。",
  },
};

// ---- Utils ----
const getInitialLang = (): Lang => {
  try {
    const u = new URL(typeof window !== "undefined" ? location.href : "http://x");
    const q = u.searchParams.get("lang");
    if (q === "en" || q === "zh") return q;
    const s = typeof window !== "undefined" ? localStorage.getItem("lusmind_lang") : null;
    if (s === "en" || s === "zh") return s as Lang;
    return /zh/i.test(typeof navigator !== "undefined" ? navigator.language : "en") ? "zh" : "en";
  } catch {
    return "en";
  }
};

const currency = (n: number, code = CURRENCY, locale = LOCALE) => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n} ${code}`;
  }
};

const priceWithGST = (n: number) => Math.max(0, Math.round(n * (1 + GST) * 100) / 100);
const nameOf = (p: Product, l: Lang) => (l === "zh" ? p.nameZh || p.name : p.nameEn || p.name);
const descOf = (p: Product, l: Lang) => (l === "zh" ? p.descriptionZh || p.description : p.descriptionEn || p.description);
const varName = (p: Product, id: string, l: Lang) => {
  const v = p.variants.find((x) => x.id === id);
  return v ? (l === "zh" ? v.nameZh || v.name : v.nameEn || v.name) : "";
};
const best = (a: readonly Product[]) =>
  [...a].sort((x, y) => y.reviews - x.reviews || y.rating - x.rating || y.createdAt - x.createdAt)[0];

// ---- Data ----
const products: readonly Product[] = [
  {
    id: "p1",
    name: "Blueberry Raspberry",
    nameEn: "Blueberry Raspberry",
    nameZh: "蓝莓树莓",
    description: "蓝莓×树莓，冷感清爽，回甜干净。",
    descriptionEn: "Blueberry × Raspberry, crisp-cool with a clean sweet finish.",
    descriptionZh: "蓝莓×树莓，冷感清爽，回甜干净。",
    price: 12.9,
    currency: "AUD",
    image:
      "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?q=80&w=1600&auto=format&fit=crop",
    variants: [
      { id: "v1", name: "30ml / 3%", nameEn: "30 ml / 3%", nameZh: "30毫升 / 3%" },
      { id: "v2", name: "30ml / 5%", nameEn: "30 ml / 5%", nameZh: "30毫升 / 5%" },
    ],
    category: "Fruity",
    strength: "3%",
    rating: 4.6,
    reviews: 214,
    createdAt: 1730200000000,
    badge: "BEST",
  },
  {
    id: "p2",
    name: "Niagara Grape",
    nameEn: "Niagara Grape",
    nameZh: "尼亚加拉白葡萄",
    description: "尼亚加拉白葡萄，清脆香气与冷调平衡。",
    descriptionEn: "Niagara white grape, crisp aroma balanced with coolness.",
    descriptionZh: "尼亚加拉白葡萄，清脆香气与冷调平衡。",
    price: 12.9,
    currency: "AUD",
    image:
      "https://images.unsplash.com/photo-1567171670060-2913f6b9c089?q=80&w=1600&auto=format&fit=crop",
    variants: [
      { id: "v1", name: "30ml / 3%", nameEn: "30 ml / 3%", nameZh: "30毫升 / 3%" },
      { id: "v2", name: "30ml / 5%", nameEn: "30 ml / 5%", nameZh: "30毫升 / 5%" },
    ],
    category: "Fruity",
    strength: "5%",
    rating: 4.7,
    reviews: 331,
    createdAt: 1731600000000,
    badge: "POPULAR",
  },
  {
    id: "p3",
    name: "Melon Yogurt Ice",
    nameEn: "Melon Yogurt Ice",
    nameZh: "哈密瓜酸奶冰",
    description: "哈密瓜×酸奶，绵密顺滑，冰爽收口。",
    descriptionEn: "Hami melon × yogurt, creamy and smooth with an icy finish.",
    descriptionZh: "哈密瓜×酸奶，绵密顺滑，冰爽收口。",
    price: 12.9,
    currency: "AUD",
    image: "https://images.unsplash.com/photo-1541789660-6b2c5a4ab04b?q=80&w=1600&auto=format&fit=crop",
    variants: [
      { id: "v1", name: "30ml / 3%", nameEn: "30 ml / 3%", nameZh: "30毫升 / 3%" },
      { id: "v2", name: "30ml / 5%", nameEn: "30 ml / 5%", nameZh: "30毫升 / 5%" },
    ],
    category: "Dessert",
    strength: "3%",
    rating: 4.4,
    reviews: 97,
    createdAt: 1732400000000,
    badge: "NEW",
  },
  {
    id: "p4",
    name: "Citrus Fizz",
    nameEn: "Citrus Fizz",
    nameZh: "柑橘汽水",
    description: "柑橘汽水，清爽微酸带气泡感。",
    descriptionEn: "Citrus soda—refreshing, lightly tart with effervescence.",
    descriptionZh: "柑橘汽水，清爽微酸带气泡感。",
    price: 11.9,
    currency: "AUD",
    image: "https://images.unsplash.com/photo-1541976076758-347942db1970?q=80&w=1600&auto=format&fit=crop",
    variants: [
      { id: "v1", name: "30ml / 3%", nameEn: "30 ml / 3%", nameZh: "30毫升 / 3%" },
      { id: "v2", name: "30ml / 5%", nameEn: "30 ml / 5%", nameZh: "30毫升 / 5%" },
    ],
    category: "Fruity",
    strength: "3%",
    rating: 4.2,
    reviews: 61,
    createdAt: 1729000000000,
  },
  {
    id: "p5",
    name: "Rainbow Candy",
    nameEn: "Rainbow Candy",
    nameZh: "彩虹软糖",
    description: "彩虹软糖，多层果味甜感，童年回忆。",
    descriptionEn: "Rainbow candy—layered fruity sweetness, nostalgic.",
    descriptionZh: "彩虹软糖，多层果味甜感，童年回忆。",
    price: 13.5,
    currency: "AUD",
    image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop",
    variants: [
      { id: "v1", name: "30ml / 3%", nameEn: "30 ml / 3%", nameZh: "30毫升 / 3%" },
      { id: "v2", name: "30ml / 5%", nameEn: "30 ml / 5%", nameZh: "30毫升 / 5%" },
    ],
    category: "Dessert",
    strength: "5%",
    rating: 4.8,
    reviews: 512,
    createdAt: 1733000000000,
    badge: "BEST",
  },
  {
    id: "p6",
    name: "Mint Breeze",
    nameEn: "Mint Breeze",
    nameZh: "薄荷微风",
    description: "薄荷清凉，干净利落。",
    descriptionEn: "Mint freshness that is clean and brisk.",
    descriptionZh: "薄荷清凉，干净利落。",
    price: 10.9,
    currency: "AUD",
    image: "https://images.unsplash.com/photo-1510626176961-4b57d4fbad03?q=80&w=1600&auto=format&fit=crop",
    variants: [
      { id: "v1", name: "30ml / 3%", nameEn: "30 ml / 3%", nameZh: "30毫升 / 3%" },
      { id: "v2", name: "30ml / 5%", nameEn: "30 ml / 5%", nameZh: "30毫升 / 5%" },
    ],
    category: "Menthol",
    strength: "3%",
    rating: 4.1,
    reviews: 44,
    createdAt: 1727000000000,
  },
];

const reviews = [
  { name: "Alex Chen", avatar: "A", monthsAgo: 1, rating: 5, textEn: "10/10 service and great product range. Definitely legit.", textZh: "服务满分，产品线很全，靠谱。" },
  { name: "Maya Li", avatar: "M", monthsAgo: 2, rating: 5, textEn: "Excellent service and fast response. Highly recommended shop.", textZh: "响应很快，服务优秀，非常推荐。" },
  { name: "Jordan Wright", avatar: "J", monthsAgo: 2, rating: 5, textEn: "Great team, approachable and prompt. Smooth online experience.", textZh: "团队很友好，处理迅速，线上体验顺畅。" },
];

// ---- UTM & session ----
const parseUtm = () => {
  if (typeof window === "undefined") return {} as Record<string, string>;
  const p = new URLSearchParams(location.search);
  const u: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
    const v = p.get(k);
    if (v) u[k] = v;
  });
  return u;
};

const ensureSid = () => {
  if (typeof window === "undefined") return "server";
  const K = "lusmind_session_id";
  let s = localStorage.getItem(K);
  if (!s) {
    s = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(K, s);
  }
  return s;
};

// ---- Telegram helpers ----
const tgLink = ({ bot, username, payload, text }: { bot?: string; username?: string; payload?: string; text?: string }) => {
  if (bot) {
    if (payload) return `https://t.me/${bot}?start=${encodeURIComponent(payload)}`;
    if (text) return `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${bot}`)}&text=${encodeURIComponent(text)}`;
    return `https://t.me/${bot}`;
  }
  if (username) {
    if (text) return `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${username}`)}&text=${encodeURIComponent(text)}`;
    return `https://t.me/${username}`;
  }
  return `https://t.me/share/url?url=${encodeURIComponent("https://t.me/")}&text=${encodeURIComponent(text || "")}`;
};

const openTg = (href: string, bot?: string, user?: string) => {
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const m = /(iPhone|iPad|iPod|Android)/i.test(ua);
    const d = bot || user;
    if (m && d) {
      const deep = `tg://resolve?domain=${d}`;
      const t = Date.now();
      (window as any).location.href = deep;
      setTimeout(() => {
        if (Date.now() - t < 1500) window.open(href, "_blank", "noopener,noreferrer");
      }, 1200);
      return;
    }
  } catch {}
  window.open(href, "_blank", "noopener,noreferrer");
};

// ---- Icons ----
const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="#f5b700" />
  </svg>
);
const IconGoogle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.32 0-6.02-2.74-6.02-6.1S8.18 6 11.5 6c1.9 0 3.18.8 3.9 1.5l2.66-2.57C16.9 3.4 14.9 2.6 12 2.6 6.9 2.6 2.8 6.7 2.8 11.8s4.1 9.2 9.2 9.2c5.3 0 8.8-3.7 8.8-8.9 0-.6-.06-1.04-.14-1.5H12z"
    />
  </svg>
);
const IconVerified = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="9" fill="#0a66ff" />
    <path d="M8.5 12.5l2.2 2.2 4.3-4.3" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const IconTruck = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
    <path d="M3 7h10v8H3z" fill="#1D1D1F" fillOpacity=".08" />
    <path d="M13 7h3l3 4v4h-6V7z" fill="#1D1D1F" fillOpacity=".08" />
    <path d="M3 7h10v8H3zM16 7h.586L20 10.414V15h-4V7z" stroke="#1D1D1F" strokeWidth="1.2" fill="none" />
    <circle cx="7" cy="17" r="2" stroke="#1D1D1F" strokeWidth="1.2" fill="white" />
    <circle cx="17" cy="17" r="2" stroke="#1D1D1F" strokeWidth="1.2" fill="white" />
  </svg>
);
const IconTag = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
    <path d="M3 12l9-9 9 9-9 9-9-9z" fill="#1D1D1F" fillOpacity=".06" />
    <path d="M12 3l9 9-9 9-9-9 9-9z" stroke="#1D1D1F" strokeWidth="1.2" fill="none" />
    <circle cx="15.5" cy="8.5" r="1.5" fill="#1D1D1F" />
  </svg>
);
const IconShield = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" fill="#1D1D1F" fillOpacity=".06" />
    <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" stroke="#1D1D1F" strokeWidth="1.2" fill="none" />
    <path d="M8.5 12.5l2.5 2.5 4.5-4.5" stroke="#1D1D1F" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </svg>
);

// ---- UI atoms ----
const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex items-start gap-3">
    <div className="shrink-0 rounded-2xl bg-[#F5F5F7] border border-black/5 p-2">{icon}</div>
    <div>
      <div className="text-[15px] md:text-base font-semibold text-[#1D1D1F]">{title}</div>
      <div className="text-sm text-[#6E6E73] leading-relaxed">{desc}</div>
    </div>
  </div>
);

const Advantage = ({ lang }: { lang: Lang }) => {
  const t = T[lang];
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="rounded-[28px] bg-white border border-black/5 p-6 md:p-8">
        <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-[#1D1D1F]">{t.advTitle}</h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
          <FeatureCard icon={<IconTruck />} title={t.advItems.deliverAU.title} desc={t.advItems.deliverAU.desc} />
          <FeatureCard icon={<IconTag />} title={t.advItems.competitivePrice.title} desc={t.advItems.competitivePrice.desc} />
          <FeatureCard icon={<IconShield />} title={t.advItems.genuine.title} desc={t.advItems.genuine.desc} />
        </div>
        <div className="mt-8 pt-6 border-t border-black/5">
          <h4 className="text-lg md:text-xl font-semibold tracking-tight text-[#1D1D1F]">{t.whyTitle}</h4>
          <p className="mt-2 text-[#1D1D1F] text-[15px]">
            {t.vardexIntro} <span className="whitespace-pre-line">{t.vardexLine}</span>
          </p>
          <p className="mt-1 text-[#6E6E73] text-[15px] leading-relaxed">{t.vardexDetail}</p>
        </div>
      </div>
    </section>
  );
};

const Avatar = ({ letter }: { name?: string; letter: string }) => (
  <div className="w-10 h-10 rounded-full bg-[#E8E8ED] border border-black/10 flex items-center justify-center text-[#1D1D1F] font-semibold">
    {letter}
  </div>
);

const ReviewCard = ({ r, lang }: { r: any; lang: Lang }) => {
  const text = lang === "zh" ? r.textZh : r.textEn;
  return (
    <div className="rounded-2xl bg-white border border-black/10 p-5 md:p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar letter={r.avatar} />
          <div>
            <div className="font-semibold text-[#1D1D1F]">{r.name}</div>
            <div className="text-xs text-[#6E6E73]">{r.monthsAgo} {lang === "zh" ? "个月前" : "months ago"}</div>
          </div>
        </div>
        <IconGoogle />
      </div>
      <div className="mt-3 flex items-center gap-1">
        {Array.from({ length: r.rating }).map((_, i) => (
          <IconStar key={i} />
        ))}
        <span className="ml-1">
          <IconVerified />
        </span>
      </div>
      <p className="mt-3 text-[15px] text-[#1D1D1F] leading-relaxed">{text}</p>
    </div>
  );
};

const Testimonials = ({ lang }: { lang: Lang }) => {
  const t = T[lang];
  const total = 28;
  return (
    <section className="bg-[#F5F5F7] border-y border-black/5">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <h3 className="text-center text-xl md:text-2xl font-semibold tracking-tight text-[#1D1D1F] mb-6">{t.testimonialsTitle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6 items-start">
          <div className="flex items-center gap-3 md:gap-4 flex-wrap">
            <div className="shrink-0">
              <IconGoogle />
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[#1D1D1F]">
              <span className="text-2xl md:text-3xl font-semibold tracking-tight leading-none">{t.ratingWord}</span>
              <span className="flex items-center gap-1 mt-[2px]" aria-label="5 stars">
                {[0, 1, 2, 3, 4].map((i) => (
                  <IconStar key={i} />
                ))}
              </span>
              <span className="text-sm md:text-base text-[#6E6E73] leading-none">
                {t.basedOn} <span className="font-semibold text-[#1D1D1F]">{total}</span> {t.reviewsWord}
              </span>
              <span className="text-sm md:text-base text-[#1D1D1F]/80 leading-none">Google</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 overflow-hidden">
            {reviews.map((r, i) => (
              <ReviewCard key={i} r={r} lang={lang} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const LanguageSwitch = ({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) => (
  <div className="hidden md:flex items-center gap-1" aria-label="language switcher">
    {(["en", "zh"] as Lang[]).map((l) => (
      <button
        key={l}
        onClick={() => setLang(l)}
        className={`px-3 h-9 rounded-full text-sm border ${
          lang === l
            ? "bg-[#E8E8ED] text-[#1D1D1F] border-black/10"
            : "bg-white text-[#1D1D1F]/80 border-black/10 hover:bg-[#F5F5F7]"
        }`}
      >
        {l === "en" ? "EN" : "中文"}
      </button>
    ))}
  </div>
);

const ProductCard = ({ product, onOrder, lang }: { product: Product; onOrder: (p: Product, variantId: string, qty: number) => void; lang: Lang }) => {
  const [variantId, setVariant] = useState(product.variants[0].id);
  const [qty, setQty] = useState(1);
  const t = T[lang];
  const locale = lang === "zh" ? "zh-CN" : LOCALE;
  return (
    <article className="rounded-[28px] bg-white border border-black/5 shadow-sm overflow-hidden">
      <div className="p-6 md:p-8 text-center">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#F5F5F7]">
          <img src={product.image} alt={nameOf(product, lang)} className="absolute inset-0 w-full h-full object-contain" loading="lazy" />
        </div>
        <h3 className="mt-5 text-xl md:text-2xl font-semibold tracking-tight text-[#1D1D1F]">{nameOf(product, lang)}</h3>
        <p className="mt-2 text-sm md:text-[15px] text-[#6E6E73] leading-relaxed break-words">{descOf(product, lang)}</p>
        <div className="mt-3 text-[15px] text-[#1D1D1F]">
          {t.from} {currency(priceWithGST(product.price), product.currency, locale)} <span className="text-[#6E6E73]">· {t.inclGST}</span>
        </div>
        <div className="mt-5 flex items-center justify-center gap-3">
          <select
            className="h-9 px-3 rounded-full bg-[#E8E8ED] text-[#1D1D1F] text-sm focus:outline-none"
            value={variantId}
            onChange={(e) => setVariant(e.target.value)}
            aria-label={lang === "zh" ? "选择规格" : "Choose variant"}
          >
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {lang === "zh" ? v.nameZh || v.name : v.nameEn || v.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={99}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
            className="w-20 h-9 px-3 rounded-full bg-[#E8E8ED] text-[#1D1D1F] text-sm focus:outline-none"
            aria-label={lang === "zh" ? "数量" : "Quantity"}
          />
          <button
            onClick={() => onOrder(product, variantId, qty)}
            className="h-9 px-5 rounded-full bg-[#0071e3] text-white text-sm font-medium hover:brightness-95 active:translate-y-px"
          >
            {t.btnOrder}
          </button>
        </div>
      </div>
    </article>
  );
};

const FeaturedHero = ({ product, lang, onOrder }: { product: Product; lang: Lang; onOrder: (p: Product, variantId: string, qty: number) => void }) => {
  if (!product) return null as any;
  const t = T[lang];
  const locale = lang === "zh" ? "zh-CN" : LOCALE;
  return (
    <div className="rounded-[28px] bg-white border border-black/5 overflow-hidden grid grid-cols-1 md:grid-cols-2 items-center">
      <div className="relative bg-[#F5F5F7] aspect-[16/9] md:aspect-auto md:h-full">
        <img src={product.image} alt={nameOf(product, lang)} className="absolute inset-0 w-full h-full object-contain" loading="lazy" />
      </div>
      <div className="p-6 md:p-10">
        <div className="mb-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#E8E8ED] text-[#1D1D1F] text-xs font-medium">{t.bestSeller}</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#1D1D1F]">{nameOf(product, lang)}</h2>
        <p className="mt-2 text-[#6E6E73] text-[15px] leading-relaxed">{descOf(product, lang)}</p>
        <div className="mt-3 text-[15px] text-[#1D1D1F]">
          {t.from} {currency(priceWithGST(product.price), product.currency, locale)} <span className="text-[#6E6E73]">· {t.inclGST}</span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => onOrder(product, product.variants[0]?.id || "default", 1)}
            className="h-11 px-6 rounded-full bg-[#0071e3] text-white text-sm font-medium hover:brightness-95 active:translate-y-px"
          >
            {t.btnOrder}
          </button>
        </div>
      </div>
    </div>
  );
};

const ShippingEstimator = ({ lang }: { lang: Lang }) => {
  const [state, setState] = useState("NSW");
  const [pc, setPc] = useState("2000");
  const t = T[lang];
  const locale = lang === "zh" ? "zh-CN" : LOCALE;
  const est = (s: string, p: string) => {
    const f = (p || "").trim()[0];
    let fee = 9.9,
      etaEn = "2–6 business days",
      etaZh = "2–6 个工作日",
      zone = "National";
    if (s === "WA" || f === "6") {
      fee = 14.9;
      etaEn = "5–10 business days";
      etaZh = "5–10 个工作日";
      zone = "WA";
    }
    if (s === "NT" || /^0[89]/.test(p || "")) {
      fee = 16.9;
      etaEn = "6–12 business days";
      etaZh = "6–12 个工作日";
      zone = "NT";
    }
    if (s === "TAS" || f === "7") {
      fee = 12.9;
      etaEn = "3–7 business days";
      etaZh = "3–7 个工作日";
      zone = "TAS";
    }
    return { fee, etaEn, etaZh, zone };
  };
  const { fee, etaEn, etaZh, zone } = est(state, pc);
  return (
    <div className="rounded-[28px] bg-white border border-black/5 p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div>
          <label className="block text-sm text-[#6E6E73] mb-1">{t.stateLabel}</label>
          <select value={state} onChange={(e) => setState(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-[#F5F5F7] border border-black/10">
            {AU_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-[#6E6E73] mb-1">{t.postcodeLabel}</label>
          <input
            value={pc}
            onChange={(e) => setPc(e.target.value.replace(/[^0-9]/g, ""))}
            maxLength={4}
            inputMode="numeric"
            placeholder="2000"
            className="w-full h-11 px-3 rounded-xl bg-[#F5F5F7] border border-black/10"
          />
        </div>
        <div className="flex items-end">
          <div className="w-full rounded-xl bg-[#F5F5F7] border border-black/10 p-3">
            <div className="text-sm text-[#6E6E73]">{t.estimateLabel}</div>
            <div className="text-[15px] text-[#1D1D1F]">
              {t.shippingLabel}: <span className="font-semibold">{currency(fee, CURRENCY, locale)}</span>
            </div>
            <div className="text-xs text-[#6E6E73]">{t.etaLabel}: {lang === "zh" ? etaZh : etaEn} · {t.zoneLabel}: {zone}</div>
          </div>
        </div>
      </div>
      <p className="text-[#6E6E73] text-xs mt-3">{t.shippingHint}</p>
    </div>
  );
};

// ---- Age Gate ----
const AgeGate = ({ lang }: { lang: Lang }) => {
  const t = T[lang];
  const [confirmed, setConfirmed] = useState(() => {
    try {
      return localStorage.getItem("age_gate_ok") === "1";
    } catch {
      return false;
    }
  });
  if (confirmed) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm p-6 text-center">
        <h2 className="text-xl font-semibold mb-2 text-[#1D1D1F]">{t.ageTitle}</h2>
        <p className="text-sm text-[#6E6E73] mb-4 leading-relaxed">{t.ageText}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              try {
                localStorage.setItem("age_gate_ok", "1");
              } catch {}
              setConfirmed(true);
            }}
            className="h-10 px-6 rounded-full bg-[#0071e3] text-white text-sm font-medium hover:brightness-95"
          >
            {t.ageYes}
          </button>
        </div>
        <p className="mt-3 text-xs text-[#6E6E73]">{t.ageUnder}</p>
      </div>
    </div>
  );
};

// ---- Runtime tests ----
function runTests() {
  try {
    if (typeof window !== "undefined" && (window as any).__VAPLUS_TESTED__) return;
    if (typeof window !== "undefined") (window as any).__VAPLUS_TESTED__ = true;

    console.groupCollapsed("%c[VAPLUS] runtime tests", "color:#0ea5e9");

    const cur = currency(10);
    console.assert(typeof cur === "string" && /10/.test(cur), "currency includes amount", cur);
    console.assert(priceWithGST(10) === 11, "GST math");

    const u1 = tgLink({ bot: "TestBot", text: "hello" });
    console.assert(u1.includes("t.me/share/url") && u1.includes("TestBot"), "tg share bot", u1);
    const u2 = tgLink({ username: "tester", text: "hi" });
    console.assert(u2.includes("t.me/share/url") && u2.includes("tester"), "tg share user", u2);

    // i18n integrity
    console.assert(T.en.btnOrder === "Order via Telegram", "i18n en btnOrder stable");
    console.assert(T.zh.btnOrder === "下单", "i18n zh btnOrder");

    console.assert(Array.isArray(products) && products.length >= 6, "products >=6");
    const asc = [...products].sort((a, b) => a.price - b.price);
    console.assert(asc[0].price <= asc[1].price, "price asc");
    console.assert(best(products)?.id === "p5", "best is p5");

    const hasCn = (s: string) => /[一-鿿]/.test(s);
    console.assert(!hasCn(T.en.advTitle) && !hasCn(T.en.storeTagline), "EN no CN");
    console.assert(hasCn(T.zh.advTitle) && hasCn(T.zh.storeTagline), "ZH has CN");
    console.assert(!hasCn(descOf(products[0], "en")) && hasCn(descOf(products[0], "zh")), "desc split");
    console.assert(!hasCn(nameOf(products[0], "en")) && hasCn(nameOf(products[0], "zh")), "name split");

    const j = ["a", "b"].join("\n");
    console.assert(j === "a\nb", "join \\n", j);

    // Extra: ensure AU currency formatting on en-AU is stable
    const curAud = currency(1, "AUD", "en-AU");
    console.assert(/A|\$/.test(curAud), "AUD formatted", curAud);

    console.groupEnd();
  } catch (e) {
    console.warn("[VAPLUS tests] skipped", e);
  }
}

// ---- Main Component ----
export default function LusmindStorefrontApple() {
  const [lang, setLangState] = useState<Lang>(getInitialLang());
  const [q, setQ] = useState("");
  const [utm, setUtm] = useState<Record<string, string>>({});
  const sid = useMemo(() => ensureSid(), []);
  const t = T[lang];
  const locale = lang === "zh" ? "zh-CN" : LOCALE;

  useEffect(() => {
    setUtm(parseUtm());
  }, []);
  useEffect(() => {
    runTests();
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lusmind_lang", l);
      document.documentElement.lang = l;
    } catch {}
  };

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s
      ? products.filter(
          (p) => nameOf(p, lang).toLowerCase().includes(s) || descOf(p, lang).toLowerCase().includes(s)
        )
      : [...products];
  }, [q, lang]);

  const top = useMemo(() => best(products), []);

  const buildMsg = (p: Product, vId: string, qty: number) =>
    [
      `${t.orderHeader}`,
      `${t.orderProduct}: ${nameOf(p, lang)}`,
      `${t.orderVariant}: ${varName(p, vId, lang)}`,
      `${t.orderQty}: ${qty}`,
      `${t.orderUnitPrice}: ${currency(p.price, p.currency, locale)}`,
      `${t.orderSubtotalEx}: ${currency(p.price * qty, p.currency, locale)}`,
      "——",
      `${t.orderSource}: website`,
      `${t.orderSession}: ${sid}`,
      utm.utm_source && `utm_source=${utm.utm_source}`,
      utm.utm_medium && `utm_medium=${utm.utm_medium}`,
      utm.utm_campaign && `utm_campaign=${utm.utm_campaign}`,
      utm.utm_term && `utm_term=${utm.utm_term}`,
      utm.utm_content && `utm_content=${utm.utm_content}`,
    ]
      .filter(Boolean)
      .join("\n");

  const order = (p: Product, vId: string, qty: number) => {
    const text = buildMsg(p, vId, qty);
    try {
      const payload = {
        event: "lead_intent",
        ts: Date.now(),
        sessionId: sid,
        productId: p.id,
        variantId: vId,
        qty,
        utm,
        language: lang,
        page: typeof window !== "undefined" ? location.href : "server",
      };
      console.log("[LEAD]", payload);
      if (navigator.sendBeacon)
        navigator.sendBeacon(LEAD_ENDPOINT, new Blob([JSON.stringify(payload)], { type: "application/json" }));
    } catch {}

    const href = tgLink({ bot: TG_BOT || undefined, username: TG_BOT ? undefined : TG_USER, text });
    openTg(href, TG_BOT || undefined, TG_BOT ? undefined : TG_USER);
  };

  return (
    <div className="min-h-screen w-full text-[#1D1D1F] bg-[#FBFBFD]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#FBFBFD]/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-4">
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-[20px] font-semibold tracking-tight">{t.brand}</div>
            <nav className="hidden md:flex items-center gap-5 text-sm text-[#1D1D1F]/80">
              <span className="hover:opacity-70 cursor-default">{t.nav.store}</span>
              <span className="hover:opacity-70 cursor-default">{t.nav.products}</span>
              <span className="hover:opacity-70 cursor-default">{t.nav.support}</span>
            </nav>
          </div>
          {/* Search */}
          <div className="flex-1 hidden sm:flex items-center">
            <div className="w-full h-10 rounded-full bg-white border border-black/10 flex items-center px-3">
              <svg width="16" height="16" viewBox="0 0 24 24" className="text-[#6E6E73]">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="flex-1 h-full px-2 text-[15px] text-[#1D1D1F] bg-transparent focus:outline-none"
              />
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <LanguageSwitch lang={lang} setLang={setLang} />
            <a
              href={tgLink({
                bot: TG_BOT || undefined,
                username: TG_BOT ? undefined : TG_USER,
                text: lang === "zh" ? "需要人工客服协助下单" : "Need help to place an order",
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center h-9 px-4 rounded-full bg-[#0071e3] text-white text-sm font-medium"
            >
              Telegram
            </a>
          </div>
        </div>
      </header>

      {/* Tagline */}
      <section className="mx-auto max-w-7xl px-4 pt-8 pb-4">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t.storeTagline}</h1>
      </section>

      {/* Featured best-seller */}
      {top && (
        <section className="mx-auto max-w-7xl px-4 pb-10">
          <FeaturedHero product={top} lang={lang} onOrder={order} />
        </section>
      )}

      {/* Catalog */}
      <main className="mx-auto max-w-7xl px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} lang={lang} onOrder={order} />
          ))}
        </div>
      </main>

      {/* Advantages */}
      <Advantage lang={lang} />

      {/* Policy & shipping */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="rounded-[28px] bg-white border border-black/5 p-6 md:p-8">
          <h3 className="text-xl md:text-2xl font-semibold tracking-tight">{t.policyTitle}</h3>
          <p className="mt-2 text-[#6E6E73] text-[15px] leading-relaxed">{t.policyPara}</p>
          <div className="mt-5">
            <ShippingEstimator lang={lang} />
          </div>
          <ul className="mt-4 list-disc pl-5 space-y-1 text-[#6E6E73] text-sm">
            {T[lang].policyBullets.map((b: string, i: number) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials lang={lang} />

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-4 py-10 text-sm text-[#6E6E73]">
        © {new Date().getFullYear()} VAPLUS. {t.footerRights}
      </footer>

      {/* Age Gate */}
      <AgeGate lang={lang} />
    </div>
  );
}


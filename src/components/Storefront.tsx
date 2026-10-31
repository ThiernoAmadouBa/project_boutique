"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock, Headphones, House, Laptop, Mail, MapPin, MessageCircle, Minus, PackageSearch, Phone, Plus, Search, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { shop } from "@/config/shop";
import { cn, money, telLink, waLink } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { Logo } from "./Logo";
import { ProductImage } from "./ProductImage";
import { Modal } from "./ui";
import { QrCard } from "./QrCard";

function StockBadge({ p }: { p: Product }) {
  if (p.stock <= 0) return <span className="badge bg-rose-100 text-rose-700">Rupture</span>;
  if (p.stock <= p.minStock) return <span className="badge bg-amber-100 text-amber-700">Dernières pièces</span>;
  return null;
}

function ProductCard({ p, onOpen }: { p: Product; onOpen: (p: Product) => void }) {
  const out = p.stock <= 0;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="group card flex flex-col overflow-hidden !rounded-3xl !border-slate-100 !bg-white transition duration-300 hover:-translate-y-1 hover:!border-blue-100 hover:!shadow-[0_22px_48px_rgba(37,99,235,0.13)]"
    >
      <button onClick={() => onOpen(p)} aria-label={`Voir le détail de ${p.name}`} className="relative block aspect-square overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 text-left">
        <div className={cn("h-full w-full transition duration-500 group-hover:scale-105", out && "grayscale")}>
          <ProductImage name={p.name} image={p.image} />
        </div>
        <span className="absolute left-2.5 top-2.5">
          <StockBadge p={p} />
        </span>
        <span className={cn("absolute bottom-2.5 right-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm", out ? "bg-rose-100 text-rose-700" : "bg-white/95 text-slate-700")}>
          {out ? "Stock : 0" : `Stock : ${p.stock}`}
        </span>
      </button>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">{p.category}</p>
        <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-relaxed text-slate-900">{p.name}</h3>
        <p className="mt-2 text-lg font-extrabold tracking-tight text-slate-950">{money(p.sellPrice)}</p>
        <a
          href={waLink(`Bonjour ${shop.name}, je souhaite commander : 1 × ${p.name} (${money(p.sellPrice)}).`)}
          target="_blank"
          rel="noreferrer"
          aria-disabled={out}
          className={cn(
            "btn-primary mt-4 w-full !rounded-xl !bg-[#20c968] !px-3 !py-2.5 text-xs hover:!bg-[#18b85c]",
            out && "pointer-events-none !bg-slate-200 !text-slate-400"
          )}
        >
          <MessageCircle size={15} /> {out ? "Indisponible" : "Commander"}
        </a>
      </div>
    </motion.article>
  );
}

function ProductDetail({ p, onClose }: { p: Product; onClose: () => void }) {
  const [qty, setQty] = useState(1);
  const out = p.stock <= 0;
  const max = Math.max(1, p.stock);
  const message = `Bonjour ${shop.name}, je souhaite commander :\n${qty} × ${p.name} (${money(p.sellPrice)} l'unité)\nTotal : ${money(p.sellPrice * qty)}`;
  return (
    <div>
      <div className="mb-4 aspect-video overflow-hidden rounded-2xl">
        <ProductImage name={p.name} image={p.image} />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{p.category}</p>
          <h4 className="text-xl font-extrabold text-slate-900">{p.name}</h4>
        </div>
        <StockBadge p={p} />
      </div>
      {p.description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.description}</p>}
      <p className="mt-3 text-2xl font-extrabold text-brand-700">{money(p.sellPrice)}</p>
      <p className={cn("mt-1 text-sm font-semibold", out ? "text-rose-600" : "text-emerald-700")}>
        {out ? "Rupture de stock (0)" : `En stock : ${p.stock} unité${p.stock > 1 ? "s" : ""}`}
      </p>

      {!out && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-3">
          <span className="text-sm font-semibold text-slate-600">Quantité</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="rounded-full bg-white p-2 shadow-sm ring-1 ring-slate-200 active:scale-90">
              <Minus size={16} />
            </button>
            <span className="w-8 text-center text-lg font-extrabold">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(max, q + 1))} className="rounded-full bg-white p-2 shadow-sm ring-1 ring-slate-200 active:scale-90">
              <Plus size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <a
          href={waLink(message)}
          target="_blank"
          rel="noreferrer"
          onClick={onClose}
          className={cn("btn-primary !bg-[#25D366] hover:!bg-[#1ebe5b]", out && "pointer-events-none !bg-slate-200 !text-slate-400")}
        >
          <MessageCircle size={18} /> Commander sur WhatsApp
        </a>
        <a href={telLink} className="btn-ghost">
          <Phone size={18} /> Appeler
        </a>
      </div>
    </div>
  );
}

export function Storefront() {
  const { db, ready } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tous");
  const [open, setOpen] = useState<Product | null>(null);

  const categories = useMemo(() => ["Tous", ...Array.from(new Set(db.products.map((p) => p.category))).filter(Boolean)], [db.products]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.products.filter((p) => (cat === "Tous" || p.category === cat) && (!t || `${p.name} ${p.category}`.toLowerCase().includes(t)));
  }, [db.products, q, cat]);
  const availableProducts = db.products.filter((p) => p.stock > 0).length;

  return (
    <div className="storefront-shell min-h-screen">
      {/* Barre de navigation */}
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-4 py-2 sm:py-3">
          <a href="#top" className="flex items-center gap-2.5">
            <Logo size={42} />
            <span>
              <span className="block text-base font-extrabold tracking-tight text-slate-900">{shop.name}</span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:block">Technologie & accessoires</span>
            </span>
          </a>
          <nav aria-label="Navigation principale" className="order-3 flex w-full flex-wrap items-center justify-center gap-1 border-t border-slate-100 pt-2 text-xs font-semibold text-slate-600 md:order-none md:w-auto md:gap-2 md:border-0 md:pt-0 md:text-sm">
            <a href="#top" className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 transition hover:bg-brand-50 hover:text-brand-700 sm:px-3"><House size={14} /> Accueil</a>
            <a href="#produits" className="rounded-full px-2.5 py-2 transition hover:bg-brand-50 hover:text-brand-700 sm:px-3">Produits</a>
            <a href="#contact" className="rounded-full px-2.5 py-2 transition hover:bg-brand-50 hover:text-brand-700 sm:px-3">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href={telLink} className="btn-soft !rounded-full !px-3 !py-2 sm:!px-4">
              <Phone size={16} /> <span className="hidden sm:inline">Appeler</span>
            </a>
          </div>
        </div>
      </header>

      {/* Héros */}
      <section id="top" className="storefront-hero relative isolate overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-12 sm:pb-16 sm:pt-16 lg:pb-20 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100 shadow-sm backdrop-blur">
                <Sparkles size={14} /> Bienvenue chez {shop.name}
              </span>
              <h1 className="mt-6 max-w-xl text-[2.75rem] font-black leading-[1.06] tracking-[-0.045em] text-white sm:text-6xl">
                La technologie,
                <span className="mt-1 block text-cyan-300">en toute simplicité.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-blue-100 sm:text-lg">{shop.tagline}</p>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-300">
                Parcourez notre sélection et contactez-nous pour trouver l’équipement qui vous convient.
              </p>
              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
                <a href="#produits" className="btn-primary group !min-h-12 !justify-between !rounded-xl !px-5 shadow-lg shadow-brand-600/20 min-[420px]:!justify-center">
                  Découvrir les produits <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href={waLink(`Bonjour ${shop.name}, j'aimerais avoir des informations.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn !min-h-12 !rounded-xl !bg-[#20c968] !px-5 !text-white shadow-md transition hover:-translate-y-0.5 hover:!bg-[#18b85c]"
                >
                  <MessageCircle size={18} /> Nous écrire sur WhatsApp
                </a>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium text-blue-100">
                <span className="inline-flex items-center gap-2"><Smartphone size={16} className="text-cyan-300" /> Téléphones</span>
                <span className="inline-flex items-center gap-2"><Headphones size={16} className="text-cyan-300" /> Audio</span>
                <span className="inline-flex items-center gap-2"><Laptop size={16} className="text-cyan-300" /> Informatique</span>
              </div>
              {shop.address && (
                <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-300">
                  <MapPin size={15} className="shrink-0 text-cyan-300" /> Retrouvez-nous : {shop.address}
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.55 }}
              className="relative mx-auto w-full max-w-[34rem]"
            >
              <div className="hero-showcase relative overflow-hidden rounded-[2rem] p-6 text-white shadow-2xl shadow-slate-900/15 sm:p-8">
                <div className="relative z-10 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> L’univers {shop.name}
                  </span>
                  <Logo size={42} className="rounded-full bg-white/10 p-1 ring-1 ring-white/15" />
                </div>
                <h2 className="relative z-10 mt-8 max-w-sm text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                  Tout pour rester connecté.
                </h2>
                <p className="relative z-10 mt-2 max-w-sm text-sm leading-relaxed text-blue-100/75">
                  Téléphones, audio et accessoires pour accompagner votre quotidien.
                </p>

                <div className="relative mt-8 grid min-h-[14rem] grid-cols-[1fr_0.82fr] gap-3 sm:min-h-[16rem] sm:gap-4">
                  <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/30 to-white/[0.06] p-4 sm:p-5">
                    <span className="absolute -right-7 -top-8 h-36 w-36 rounded-full border border-white/10" />
                    <span className="absolute -right-2 -top-3 h-24 w-24 rounded-full border border-white/10" />
                    <Smartphone size={58} strokeWidth={1.2} className="relative text-cyan-200 sm:h-[4.5rem] sm:w-[4.5rem]" />
                    <span className="relative">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/65">Au quotidien</span>
                      <span className="mt-1 block text-sm font-bold sm:text-base">Téléphones & accessoires</span>
                    </span>
                  </div>
                  <div className="grid grid-rows-2 gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 sm:p-4">
                      <span className="rounded-xl bg-cyan-200/10 p-2.5 text-cyan-200"><Headphones size={21} /></span>
                      <span className="text-sm font-bold">Audio</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3 sm:p-4">
                      <span className="rounded-xl bg-indigo-200/10 p-2.5 text-indigo-200"><Laptop size={21} /></span>
                      <span className="text-sm font-bold">Informatique</span>
                    </div>
                  </div>
                </div>
                <a href="#produits" className="group relative z-10 mt-5 inline-flex items-center gap-2 text-sm font-bold text-white transition hover:text-cyan-200">
                  Voir la sélection <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section aria-label="Les services de la boutique" className="mx-auto grid max-w-6xl gap-3 px-4 pb-10 pt-5 sm:grid-cols-3 sm:gap-4 sm:pb-14">
        {[
          { icon: Smartphone, title: `${db.products.length} produit${db.products.length > 1 ? "s" : ""}`, text: "Une sélection à parcourir en boutique." },
          { icon: Sparkles, title: `${availableProducts} disponible${availableProducts > 1 ? "s" : ""}`, text: "Consultez les stocks affichés sur chaque produit." },
          { icon: MessageCircle, title: "Commande directe", text: "Échangez avec notre équipe sur WhatsApp." },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <item.icon size={18} />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900">{item.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.text}</span>
            </span>
          </div>
        ))}
      </section>

      {/* Catalogue */}
      <section id="produits" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 pt-12 sm:pt-16">
        <div className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-blue-100/80 bg-white/75 p-5 shadow-[0_18px_50px_rgba(30,64,175,0.06)] sm:p-7 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-700 ring-1 ring-blue-100">
              <Sparkles size={13} /> La sélection {shop.name}
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Tout ce qu’il vous faut, au même endroit.</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Téléphones, audio, informatique et accessoires : trouvez votre prochain coup de cœur.</p>
          </div>
          <div className="relative w-full md:w-80 md:shrink-0">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un appareil…" aria-label="Rechercher un produit" className="input !rounded-2xl !py-3 !pl-10 !shadow-sm" />
          </div>
        </div>

        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                cat === c ? "bg-brand-600 text-white shadow-md" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-brand-50"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {!ready ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card h-64 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <PackageSearch size={36} className="mb-3 text-slate-300" />
            <p className="font-bold text-slate-700">Aucun produit trouvé</p>
            <p className="text-sm text-slate-500">Essayez un autre mot-clé ou une autre catégorie.</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence>
              {list.map((p) => (
                <ProductCard key={p.id} p={p} onOpen={setOpen} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* Contact + QR */}
      <section id="contact" className="scroll-mt-20 border-y border-blue-100/70 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/50 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Toujours à votre écoute</span>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Parlons de votre prochain achat.</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Une question ou besoin d’un conseil ? {shop.manager} vous répond.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Phone, label: "Téléphone", value: shop.phone, href: telLink },
                { icon: Phone, label: "Téléphone 2", value: shop.secondaryPhone, href: `tel:${shop.secondaryPhone.replace(/[^\d+]/g, "")}` },
                { icon: MessageCircle, label: "WhatsApp", value: shop.phone, href: waLink(`Bonjour ${shop.name} !`) },
                { icon: MessageCircle, label: "WhatsApp 2", value: shop.secondaryPhone, href: waLink(`Bonjour ${shop.name} !`, shop.secondaryWhatsapp) },
                { icon: Mail, label: "Email", value: shop.email, href: `mailto:${shop.email}` },
                { icon: MapPin, label: "Adresse", value: shop.address },
                { icon: Clock, label: "Horaires", value: shop.hours },
              ].filter((c) => c.value).map((c) => {
                const body = (
                  <>
                    <span className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
                      <c.icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{c.label}</span>
                      <span className="block truncate text-sm font-bold text-slate-800">{c.value}</span>
                    </span>
                  </>
                );
                return c.href ? (
                  <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="card flex items-center gap-3 !rounded-2xl !border-slate-100 p-3.5 transition hover:-translate-y-0.5 hover:!border-blue-100 hover:shadow-md">
                    {body}
                  </a>
                ) : (
                  <div key={c.label} className="card flex items-center gap-3 !rounded-2xl !border-slate-100 p-3.5">
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="min-w-0 rounded-3xl bg-gradient-to-br from-brand-50 to-white p-4 ring-1 ring-brand-100 sm:p-6">
            <QrCard />
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 px-4 py-6 text-center text-sm text-slate-400">
        <p>© {new Date().getFullYear()} {shop.name} — Tous droits réservés</p>
        <a href="/connexion" className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300">
          <ShieldCheck size={13} /> Accès gérant
        </a>
      </footer>

      {/* Bouton WhatsApp flottant */}
      <a
        href={waLink(`Bonjour ${shop.name} !`)}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className="no-print fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition hover:scale-110"
      >
        <MessageCircle size={26} />
      </a>

      <Modal open={!!open} onClose={() => setOpen(null)} title="Détail du produit">
        {open && <ProductDetail key={open.id} p={open} onClose={() => setOpen(null)} />}
      </Modal>
    </div>
  );
}

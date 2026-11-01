"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Download, Printer, Receipt, ShoppingBag, Trash2, TrendingUp, Wallet } from "lucide-react";
import { shop } from "@/config/shop";
import { useStore } from "@/lib/store";
import { cn, downloadCsv, fmtDate, invoiceTotals, money } from "@/lib/utils";
import { Loading, PageHeader, StatCard, useToast } from "@/components/ui";

type Period = "day" | "week" | "month" | "year";
const labels: Record<Period, string> = { day: "Jour", week: "Semaine", month: "Mois", year: "Année" };
const DAY = 864e5;

function getRange(period: Period) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = new Date(y, m, now.getDate());
  let start: Date, end: Date, pStart: Date;
  let step: (d: Date) => Date;
  let label: (d: Date) => string;
  let compare: string;

  if (period === "day") {
    start = today;
    end = new Date(start.getTime() + DAY);
    pStart = new Date(start.getTime() - DAY);
    step = (d) => new Date(d.getTime() + 36e5);
    label = (d) => `${d.getHours()}h`;
    compare = "hier";
  } else if (period === "week") {
    end = new Date(today.getTime() + DAY);
    start = new Date(end.getTime() - 7 * DAY);
    pStart = new Date(start.getTime() - 7 * DAY);
    step = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    label = (d) => d.toLocaleDateString("fr-FR", { weekday: "short" });
    compare = "7 jours précédents";
  } else if (period === "month") {
    start = new Date(y, m, 1);
    end = new Date(y, m + 1, 1);
    pStart = new Date(y, m - 1, 1);
    step = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    label = (d) => String(d.getDate());
    compare = "mois précédent";
  } else {
    start = new Date(y, 0, 1);
    end = new Date(y + 1, 0, 1);
    pStart = new Date(y - 1, 0, 1);
    step = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);
    label = (d) => d.toLocaleDateString("fr-FR", { month: "short" });
    compare = "année précédente";
  }
  const buckets: { label: string; s: number; e: number }[] = [];
  for (let d = start; d < end; d = step(d)) buckets.push({ label: label(d), s: d.getTime(), e: step(d).getTime() });
  return { start: start.getTime(), end: end.getTime(), pStart: pStart.getTime(), pEnd: start.getTime(), buckets, compare };
}

export default function DashboardPage() {
  const { db, ready, clearAll, clearAllHistory } = useStore();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>("month");

  const data = useMemo(() => {
    const r = getRange(period);
    const facts = db.invoices.filter((i) => i.type === "facture");
    const inR = (i: { date: string }, s: number, e: number) => {
      const t = new Date(i.date).getTime();
      return t >= s && t < e;
    };
    const cur = facts.filter((i) => inR(i, r.start, r.end));
    const prev = facts.filter((i) => inR(i, r.pStart, r.pEnd));
    const sum = (list: typeof facts, k: "subtotal" | "profit") => list.reduce((s, i) => s + invoiceTotals(i)[k], 0);
    const revenue = sum(cur, "subtotal");
    const prevRevenue = sum(prev, "subtotal");
    const profit = sum(cur, "profit");
    const chart = r.buckets.map((b) => ({
      name: b.label,
      ca: facts.filter((i) => inR(i, b.s, b.e)).reduce((s, i) => s + invoiceTotals(i).subtotal, 0),
    }));
    const top = new Map<string, { name: string; qty: number; amount: number }>();
    cur.forEach((i) =>
      i.items.forEach((it) => {
        const t = top.get(it.productId) ?? { name: it.name, qty: 0, amount: 0 };
        t.qty += it.qty;
        t.amount += it.qty * it.price;
        top.set(it.productId, t);
      })
    );
    return {
      cur,
      revenue,
      profit,
      basket: cur.length ? revenue / cur.length : 0,
      delta: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
      chart,
      top: Array.from(top.values()).sort((a, b) => b.amount - a.amount).slice(0, 5),
      compare: r.compare,
    };
  }, [db.invoices, period]);

  const alerts = db.products.filter((p) => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock);
  const maxTop = Math.max(1, ...data.top.map((t) => t.amount));

  const exportCsv = () => {
    downloadCsv(`chiffre-affaires-${period}.csv`, [
      ["Numéro", "Date", "Client", "Total"],
      ...data.cur.map((i) => {
        const t = invoiceTotals(i);
        return [i.number, fmtDate(i.date), i.customerName, t.total];
      }),
    ]);
    toast("Fichier Excel (CSV) téléchargé");
  };

  if (!ready) return <Loading />;

  return (
    <div>
      <div className="mb-4 hidden print:block">
        <h2 className="text-xl font-bold">
          {shop.name} — Chiffre d&apos;affaires ({labels[period].toLowerCase()})
        </h2>
        <p className="text-sm text-slate-500">Édité le {fmtDate(new Date().toISOString())}</p>
      </div>
      <PageHeader
        title="Tableau de bord"
        subtitle={`Bonjour ${shop.manager}, voici l'état de votre boutique.`}
        actions={
          <>
            <button onClick={exportCsv} className="btn-ghost">
              <Download size={16} /> Excel
            </button>
            <button onClick={() => window.print()} className="btn-ghost">
              <Printer size={16} /> PDF
            </button>
            <Link href="/admin/factures/nouvelle" className="btn-primary">
              <Receipt size={16} /> Nouvelle facture
            </Link>
            {(db.invoices.length > 0 || db.movements.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      "Effacer définitivement toutes les factures, tous les devis et tous les mouvements ? Les produits, stocks et clients seront conservés."
                    )
                  ) {
                    clearAllHistory();
                    toast("Historique des ventes et indicateurs du tableau de bord réinitialisés", "info");
                  }
                }}
                className="btn-ghost text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={16} /> Réinitialiser les ventes
              </button>
            )}
          </>
        }
      />

      {db.demo && (
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/80 p-4 shadow-sm">
          <p className="text-sm text-amber-800">
            <strong>Données de démonstration.</strong> Supprimez-les pour commencer avec votre vraie boutique.
          </p>
          <button
            onClick={() => {
              if (confirm("Supprimer toutes les données de démonstration ?")) {
                clearAll();
                toast("Données de démonstration supprimées", "info");
              }
            }}
            className="btn bg-amber-500 text-white hover:bg-amber-600"
          >
            <Trash2 size={16} /> Tout supprimer
          </button>
        </div>
      )}

      <div className="no-print mb-5 inline-flex max-w-full rounded-2xl border border-blue-100/80 bg-white/85 p-1 shadow-sm backdrop-blur">
        {(Object.keys(labels) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn("rounded-xl px-3.5 py-2 text-xs font-bold transition sm:px-4 sm:text-sm", period === p ? "bg-gradient-to-r from-brand-700 to-brand-500 text-white shadow-md shadow-brand-600/20" : "text-slate-500 hover:bg-blue-50 hover:text-brand-800")}
          >
            {labels[p]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Chiffre d'affaires"
          value={money(data.revenue)}
          icon={TrendingUp}
          sub={
            data.delta === null ? (
              <span className="text-slate-400">Pas de comparaison</span>
            ) : (
              <span className={cn("inline-flex items-center gap-0.5 font-semibold", data.delta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {data.delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(data.delta).toFixed(0)}% vs {data.compare}
              </span>
            )
          }
        />
        <StatCard label="Bénéfice" value={money(data.profit)} icon={Wallet} tone="bg-amber-50 text-amber-600" sub={<span className="text-slate-400">{data.cur.length} facture(s)</span>} />
        <StatCard label="Panier moyen" value={money(data.basket)} icon={ShoppingBag} tone="bg-sky-50 text-sky-600" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="card overflow-hidden p-4 sm:p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-extrabold text-slate-900">Évolution du chiffre d&apos;affaires</p>
              <p className="mt-0.5 text-xs text-slate-500">Suivi des ventes sur la période choisie</p>
            </div>
            <span className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-brand-700">{labels[period]}</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chart} margin={{ left: -10, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="ca" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip formatter={(v) => [money(Number(v)), "Chiffre d'affaires"]} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.12)" }} />
                <Area type="monotone" dataKey="ca" stroke="#2563eb" strokeWidth={2.5} fill="url(#ca)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="mb-4">
            <p className="font-extrabold text-slate-900">Top produits</p>
            <p className="mt-0.5 text-xs text-slate-500">Meilleures ventes de la période</p>
          </div>
          {data.top.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Aucune vente sur cette période.</p>
          ) : (
            <ul className="space-y-3">
              {data.top.map((t, i) => (
                <li key={t.name}>
                  <div className="flex justify-between text-sm">
                    <span className="truncate font-semibold text-slate-700">
                      {i + 1}. {t.name}
                    </span>
                    <span className="ml-2 shrink-0 text-slate-500">{t.qty} vendu(s)</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${(t.amount / maxTop) * 100}%` }} />
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-brand-700">{money(t.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="no-print card mt-5 p-4">
          <p className="mb-3 flex items-center gap-2 font-bold text-slate-800">
            <AlertTriangle size={18} className="text-amber-500" /> Alertes de stock ({alerts.length})
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                <span className="truncate font-semibold text-slate-700">{p.name}</span>
                <span className={cn("badge ml-2 shrink-0", p.stock <= 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>
                  {p.stock <= 0 ? "Rupture" : `${p.stock} restant(s)`}
                </span>
              </div>
            ))}
          </div>
          <Link href="/admin/stock" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
            Gérer le stock →
          </Link>
        </div>
      )}

      {!db.demo && db.products.length === 0 && (
        <div className="no-print mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
          <div>
            <p>Commencez par ajouter vos produits : ils apparaîtront sur votre vitrine.</p>
            {db.invoices.some((invoice) => invoice.type === "facture") && (
              <p className="mt-1 text-xs text-slate-500">
                Les chiffres restent affichés car ils proviennent des factures enregistrées, même après la suppression des produits.{" "}
                <Link href="/admin/historique" className="font-semibold text-brand-700 hover:underline">
                  Gérer l&apos;historique des ventes
                </Link>
              </p>
            )}
          </div>
          <Link href="/admin/produits" className="btn-primary">
            Ajouter un produit
          </Link>
        </div>
      )}
    </div>
  );
}

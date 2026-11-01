"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, FileText, Plus, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, fmtDate, invoiceTotals, money, statusMeta } from "@/lib/utils";
import { EmptyState, Loading, PageHeader, StatCard } from "@/components/ui";

type Filter = "toutes" | "factures" | "devis";

export default function FacturesPage() {
  const { db, ready } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("toutes");
  const [month, setMonth] = useState("");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return db.invoices
      .map((i) => ({ inv: i, t: invoiceTotals(i) }))
      .filter(({ inv }) => {
        if (month) {
          const date = new Date(inv.date);
          if (Number.isNaN(date.getTime())) return false;
          const invoiceMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          if (invoiceMonth !== month) return false;
        }
        if (filter === "factures" && inv.type !== "facture") return false;
        if (filter === "devis" && inv.type !== "devis") return false;
        return !t || `${inv.number} ${inv.customerName}`.toLowerCase().includes(t);
      });
  }, [db.invoices, q, filter, month]);

  const periodInvoices = useMemo(
    () =>
      db.invoices.filter((invoice) => {
        if (!month) return true;
        const date = new Date(invoice.date);
        if (Number.isNaN(date.getTime())) return false;
        const invoiceMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return invoiceMonth === month;
      }),
    [db.invoices, month]
  );

  if (!ready) return <Loading />;

  const filters: { k: Filter; label: string }[] = [
    { k: "toutes", label: "Toutes" },
    { k: "factures", label: "Factures" },
    { k: "devis", label: "Devis" },
  ];

  return (
    <div>
      <PageHeader
        title="Factures & devis"
        subtitle="Créez, imprimez ou partagez vos documents."
        actions={
          <Link href="/admin/factures/nouvelle" className="btn-primary">
            <Plus size={16} /> Nouvelle facture
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatCard label="Factures" value={String(periodInvoices.filter((i) => i.type === "facture").length)} icon={FileText} />
        <StatCard label="Total des ventes" value={money(periodInvoices.filter((i) => i.type === "facture").reduce((sum, i) => sum + invoiceTotals(i).total, 0))} icon={FileText} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-10" placeholder="Numéro ou nom du client…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label htmlFor="invoice-month" className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-600">
          <CalendarDays size={16} /> Mois
          <input
            id="invoice-month"
            type="month"
            className="input w-full sm:w-auto"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {filters.map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition", filter === f.k ? "bg-brand-600 text-white shadow" : "bg-white text-slate-600 ring-1 ring-slate-200")}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun document"
          text="Créez votre première facture ou votre premier devis."
          action={
            <Link href="/admin/factures/nouvelle" className="btn-primary">
              <Plus size={16} /> Nouvelle facture
            </Link>
          }
        />
      ) : (
        <div className="card divide-y divide-slate-100">
          {rows.slice(0, 200).map(({ inv, t }) => (
            <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Link href={`/admin/factures/${inv.id}`} className="flex items-center gap-3 p-3.5 transition hover:bg-slate-50">
                <span className={cn("rounded-xl p-2.5", inv.type === "devis" ? "bg-sky-50 text-sky-600" : "bg-brand-50 text-brand-600")}>
                  <FileText size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">{inv.number}</p>
                  <p className="truncate text-xs text-slate-500">
                    {inv.customerName} · {fmtDate(inv.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-slate-900">{money(t.total)}</p>
                  <span className={cn("badge mt-0.5", statusMeta[t.status].cls)}>{statusMeta[t.status].label}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

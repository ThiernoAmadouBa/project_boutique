"use client";

import { useMemo, useState } from "react";
import { CalendarDays, PackageMinus, PackagePlus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { MovementType } from "@/lib/types";
import { cn, fmtDateTime, moveLabels } from "@/lib/utils";
import { Loading, PageHeader, useToast } from "@/components/ui";

export default function HistoryPage() {
  const { db, ready, clearAllHistory } = useStore();
  const [month, setMonth] = useState("");
  const toast = useToast();
  const movements = useMemo(
    () =>
      db.movements.filter((movement) => {
        if (!month) return true;
        const date = new Date(movement.date);
        if (Number.isNaN(date.getTime())) return false;
        const movementMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return movementMonth === month;
      }),
    [db.movements, month]
  );

  if (!ready) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Historique"
        subtitle="Retrouvez les mouvements de stock et les opérations sur vos produits."
        actions={
          db.movements.length > 0 || db.invoices.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Effacer définitivement tous les mouvements de stock, toutes les factures et tous les devis ? Les produits, stocks et clients seront conservés."
                  )
                ) {
                  clearAllHistory();
                  toast("Historique, factures et devis supprimés", "info");
                }
              }}
              className="btn-ghost text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={16} /> Effacer tout l&apos;historique
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="history-month" className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <CalendarDays size={16} /> Filtrer par mois
        </label>
        <input
          id="history-month"
          type="month"
          className="input w-full sm:ml-auto sm:w-auto"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </div>

      <div className="card divide-y divide-slate-100">
        {movements.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-400">
            {month ? "Aucun mouvement pour ce mois." : "Aucun mouvement pour le moment."}
          </p>
        )}
        {movements.slice(0, 150).map((movement) => (
          <div key={movement.id} className="flex items-center gap-3 p-3">
            <span className={cn("rounded-xl p-2", movement.delta >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
              {movement.delta >= 0 ? <PackagePlus size={16} /> : <PackageMinus size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{movement.productName}</p>
              <p className="truncate text-xs text-slate-400">
                {moveLabels[movement.type as MovementType]} · {movement.note}
              </p>
            </div>
            <div className="text-right">
              <p className={cn("text-sm font-extrabold", movement.delta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
              </p>
              <p className="text-[11px] text-slate-400">{fmtDateTime(movement.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

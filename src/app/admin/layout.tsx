"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Boxes, ClipboardCheck, FileText, History, LayoutDashboard, LogOut, Package, Settings, Store, Users } from "lucide-react";
import { shop } from "@/config/shop";
import { restoreAuthSession, signOut } from "@/lib/auth";
import type { AuthSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Loading, useToast } from "@/components/ui";

const nav = [
  { href: "/admin", label: "Tableau de bord", short: "Accueil", icon: LayoutDashboard },
  { href: "/admin/produits", label: "Produits", short: "Produits", icon: Package },
  { href: "/admin/stock", label: "Stock", short: "Stock", icon: Boxes },
  { href: "/admin/inventaire", label: "Inventaire", short: "Inventaire", icon: ClipboardCheck },
  { href: "/admin/factures", label: "Factures", short: "Factures", icon: FileText },
  { href: "/admin/clients", label: "Clients", short: "Clients", icon: Users },
  { href: "/admin/historique", label: "Historique", short: "Historique", icon: History },
  { href: "/admin/parametres", label: "Paramètres", short: "Réglages", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ok, setOk] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    restoreAuthSession()
      .then((current) => {
        if (!active) return;
        if (!current) router.replace("/connexion");
        else {
          setSession(current);
          setOk(true);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          toast(error instanceof Error ? error.message : "Vérification du compte impossible.", "error");
          router.replace("/connexion");
        }
      });
    return () => {
      active = false;
    };
  }, [router, toast]);

  if (!ok)
    return (
      <div className="min-h-screen">
        <Loading />
      </div>
    );

  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const logout = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Déconnexion impossible.", "error");
    }
  };

  return (
    <div className="admin-shell lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-gradient-to-b from-[#07152d] via-[#0b1c3c] to-[#102b53] p-4 shadow-[8px_0_32px_rgba(15,23,42,0.12)] lg:flex">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-2.5 py-3 shadow-sm">
          <Logo size={42} />
          <div className="min-w-0">
            <p className="truncate font-extrabold text-white">{shop.name}</p>
            <p className="truncate text-xs text-blue-200/70">{session?.name}</p>
          </div>
        </div>
        <nav className="mt-7 flex flex-1 flex-col gap-1.5">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition duration-200",
                active(n.href) ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/20" : "text-blue-100/75 hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
              )}
            >
              <n.icon size={18} /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1">
          <Link href="/" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-blue-100/75 transition hover:bg-white/10 hover:text-white">
            <Store size={18} /> Voir la vitrine
          </Link>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/10 hover:text-rose-100">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-white/70 bg-white/90 px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <span>
            <span className="block font-extrabold leading-tight text-slate-900">{shop.name}</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-brand-600">Espace de gestion</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Voir la vitrine">
            <Store size={18} />
          </Link>
          <button onClick={logout} className="rounded-xl p-2 text-rose-600 hover:bg-rose-50" aria-label="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 pb-28 sm:p-6 lg:pb-10">{children}</main>

      <nav aria-label="Navigation de gestion" className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 grid-rows-2 border-t border-white/10 bg-[#07152d]/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(7,21,45,0.2)] backdrop-blur-xl lg:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={cn("flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold transition sm:text-[11px]", active(n.href) ? "bg-cyan-300 text-slate-950" : "text-blue-100/65 hover:bg-white/10 hover:text-white")}>
            <n.icon size={18} />
            {n.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}

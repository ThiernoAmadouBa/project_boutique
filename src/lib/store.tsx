"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Customer, DB, Invoice, InvoiceItem, Movement, MovementType, Product } from "./types";
import { useToast } from "@/components/ui";
import { makeSeed } from "./seed";
import { isSupabaseConfigured, requireSupabase, supabase } from "./supabase";
import { uid } from "./utils";

const KEY = "boutique-db-v1";
const EMPTY: DB = { products: [], movements: [], customers: [], invoices: [], demo: false };

export type ProductInput = Omit<Product, "id" | "createdAt">;
export type CustomerInput = Omit<Customer, "id" | "createdAt">;
export interface InvoiceInput {
  type: Invoice["type"];
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: InvoiceItem[];
}

interface Ctx {
  db: DB;
  ready: boolean;
  error: string;
  saveProduct: (d: ProductInput, id?: string) => string;
  deleteProduct: (id: string) => void;
  moveStock: (productId: string, type: MovementType, delta: number, note: string) => void;
  applyInventory: (counts: Record<string, number>) => void;
  saveCustomer: (d: CustomerInput, id?: string) => string;
  createInvoice: (i: InvoiceInput) => string;
  convertQuote: (id: string) => void;
  deleteInvoice: (id: string) => void;
  clearAllHistory: () => void;
  resetDemo: () => void;
  clearAll: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

const mkMove = (p: Product, type: MovementType, delta: number, note: string): Movement => ({
  id: uid(),
  productId: p.id,
  productName: p.name,
  type,
  delta,
  note,
  date: new Date().toISOString(),
});

function nextNumber(list: Invoice[], type: Invoice["type"]) {
  const prefix = type === "facture" ? "FAC" : "DEV";
  const year = new Date().getFullYear();
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const max = list.reduce((m, i) => {
    const r = re.exec(i.number);
    return r ? Math.max(m, parseInt(r[1], 10)) : m;
  }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

function applyItems(db: DB, items: InvoiceItem[], dir: 1 | -1, type: MovementType, note: string) {
  const qtyBy = new Map<string, number>();
  items.forEach((i) => qtyBy.set(i.productId, (qtyBy.get(i.productId) ?? 0) + i.qty));
  const moves: Movement[] = [];
  const products = db.products.map((p) => {
    const q = qtyBy.get(p.id);
    if (!q) return p;
    const delta = dir * q;
    moves.push(mkMove(p, type, delta, note));
    return { ...p, stock: p.stock + delta };
  });
  return { products, movements: [...moves, ...db.movements] };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [db, setDb] = useState<DB>(EMPTY);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadError, setLoadError] = useState("");
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoadError("La connexion Supabase n’est pas configurée. Vérifiez les variables d’environnement.");
      setReady(true);
      return;
    }

    let active = true;
    let loadVersion = 0;
    const client = supabase;

    const loadStore = async (hasSession: boolean) => {
      if (!active) return;
      const version = ++loadVersion;
      setReady(false);
      setLoadError("");
      try {
        let nextDb = EMPTY;
        let admin = false;

        if (hasSession) {
          const { data: allowed, error: roleError } = await client.rpc("is_shop_admin");
          if (roleError) throw new Error(`Vérification des droits impossible : ${roleError.message}`);
          admin = Boolean(allowed);
        }

        if (admin) {
          const { data: remoteState, error: stateError } = await client.rpc("get_shop_state");
          if (stateError) throw new Error(`Chargement des données impossible : ${stateError.message}`);

          if (remoteState) {
            const state = remoteState as Partial<DB>;
            if (
              !Array.isArray(state.products) ||
              !Array.isArray(state.movements) ||
              !Array.isArray(state.customers) ||
              !Array.isArray(state.invoices)
            ) {
              throw new Error("Les données Supabase ont un format invalide.");
            }
            nextDb = { ...EMPTY, ...state };
          } else {
            let localState: DB | null = null;
            try {
              const raw = localStorage.getItem(KEY);
              if (raw) {
                const parsed = JSON.parse(raw) as Partial<DB>;
                if (
                  Array.isArray(parsed.products) &&
                  Array.isArray(parsed.movements) &&
                  Array.isArray(parsed.customers) &&
                  Array.isArray(parsed.invoices)
                ) {
                  localState = { ...EMPTY, ...parsed };
                }
              }
            } catch (error) {
              console.error("La copie locale de la boutique ne peut pas être migrée.", error);
            }
            nextDb = localState ?? EMPTY;
            const { error: migrationError } = await client.rpc("save_shop_state", { payload: nextDb });
            if (migrationError) throw new Error(`Migration initiale impossible : ${migrationError.message}`);
          }
        } else {
          const response = await fetch("/api/catalog", { cache: "no-store" });
          if (!response.ok) {
            const result = await response.json().catch(() => null) as { error?: string } | null;
            throw new Error(result?.error ?? `Chargement du catalogue public impossible (HTTP ${response.status}).`);
          }
          const products: unknown = await response.json();
          if (!Array.isArray(products)) {
            throw new Error("Le catalogue public reçu est dans un format invalide.");
          }
          nextDb = {
            ...EMPTY,
            products: products.map((product) => ({
              ...product,
              buyPrice: 0,
              stock: Number(product.stock) || 0,
              minStock: Number(product.minStock) || 0,
            })) as Product[],
          };
        }

        if (!active || version !== loadVersion) return;
        setDb(nextDb);
        setIsAdmin(admin);
        setLoadError("");
        setReady(true);
      } catch (error) {
        if (!active || version !== loadVersion) return;
        const message = error instanceof Error ? error.message : "Chargement des données de la boutique impossible.";
        setLoadError(message);
        setIsAdmin(false);
        setReady(true);
        console.error("Erreur de connexion Supabase.", error);
      }
    };

    client.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      return loadStore(Boolean(data.session));
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : "Lecture de la session Supabase impossible.";
      setLoadError(message);
      setReady(true);
      console.error("Erreur de session Supabase.", error);
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      void loadStore(Boolean(session));
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready || !isAdmin || loadError) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {}
    writeQueue.current = writeQueue.current
      .then(async () => {
        const client = requireSupabase();
        const { error } = await client.rpc("save_shop_state", { payload: db });
        if (error) throw new Error(`Enregistrement des données impossible : ${error.message}`);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Enregistrement Supabase impossible.";
        setLoadError(message);
        toast(message, "error");
        console.error("Erreur d’enregistrement Supabase.", error);
      });
  }, [db, ready, isAdmin, loadError, toast]);

  const saveProduct = useCallback((d: ProductInput, id?: string) => {
    const pid = id ?? uid();
    setDb((prev) => {
      if (id) {
        return { ...prev, products: prev.products.map((p) => (p.id === id ? { ...p, ...d, stock: p.stock } : p)) };
      }
      const product: Product = { ...d, id: pid, createdAt: new Date().toISOString() };
      const movements = d.stock > 0 ? [mkMove(product, "entree", d.stock, "Stock initial"), ...prev.movements] : prev.movements;
      return { ...prev, products: [product, ...prev.products], movements };
    });
    return pid;
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setDb((prev) => ({ ...prev, products: prev.products.filter((p) => p.id !== id) }));
  }, []);

  const moveStock = useCallback((productId: string, type: MovementType, delta: number, note: string) => {
    setDb((prev) => {
      const p = prev.products.find((x) => x.id === productId);
      if (!p || delta === 0) return prev;
      return {
        ...prev,
        products: prev.products.map((x) => (x.id === productId ? { ...x, stock: x.stock + delta } : x)),
        movements: [mkMove(p, type, delta, note), ...prev.movements],
      };
    });
  }, []);

  const applyInventory = useCallback((counts: Record<string, number>) => {
    setDb((prev) => {
      const moves: Movement[] = [];
      const products = prev.products.map((p) => {
        const c = counts[p.id];
        if (c === undefined || c === p.stock) return p;
        moves.push(mkMove(p, "inventaire", c - p.stock, `Inventaire : ${p.stock} → ${c}`));
        return { ...p, stock: c };
      });
      return { ...prev, products, movements: [...moves, ...prev.movements] };
    });
  }, []);

  const saveCustomer = useCallback((d: CustomerInput, id?: string) => {
    const cid = id ?? uid();
    setDb((prev) => {
      if (id) {
        return {
          ...prev,
          customers: prev.customers.map((c) => (c.id === id ? { ...c, ...d } : c)),
          invoices: prev.invoices.map((i) =>
            i.customerId === id ? { ...i, customerName: d.name, customerPhone: d.phone } : i
          ),
        };
      }
      return { ...prev, customers: [{ ...d, id: cid, createdAt: new Date().toISOString() }, ...prev.customers] };
    });
    return cid;
  }, []);

  const createInvoice = useCallback((input: InvoiceInput) => {
    const id = uid();
    setDb((prev) => {
      const now = new Date().toISOString();
      const number = nextNumber(prev.invoices, input.type);
      const invoice: Invoice = {
        id,
        number,
        type: input.type,
        customerId: input.customerId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        items: input.items,
        date: now,
      };
      const stockPart =
        input.type === "facture"
          ? applyItems(prev, input.items, -1, "vente", `Vente ${number}`)
          : { products: prev.products, movements: prev.movements };
      return { ...prev, ...stockPart, invoices: [invoice, ...prev.invoices] };
    });
    return id;
  }, []);

  const convertQuote = useCallback((id: string) => {
    setDb((prev) => {
      const inv = prev.invoices.find((i) => i.id === id);
      if (!inv || inv.type !== "devis") return prev;
      const number = nextNumber(prev.invoices, "facture");
      const stockPart = applyItems(prev, inv.items, -1, "vente", `Vente ${number}`);
      return {
        ...prev,
        ...stockPart,
        invoices: prev.invoices.map((i) =>
          i.id === id ? { ...i, type: "facture" as const, number, date: new Date().toISOString() } : i
        ),
      };
    });
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setDb((prev) => {
      const inv = prev.invoices.find((i) => i.id === id);
      if (!inv) return prev;
      const stockPart =
        inv.type === "facture"
          ? applyItems(prev, inv.items, 1, "ajustement", `Annulation ${inv.number}`)
          : { products: prev.products, movements: prev.movements };
      return { ...prev, ...stockPart, invoices: prev.invoices.filter((i) => i.id !== id) };
    });
  }, []);

  const clearAllHistory = useCallback(() => {
    setDb((prev) => ({ ...prev, movements: [], invoices: [] }));
  }, []);

  const resetDemo = useCallback(() => setDb(makeSeed()), []);
  const clearAll = useCallback(() => setDb({ ...EMPTY }), []);

  const value = useMemo<Ctx>(
    () => ({
      db,
      ready,
      error: loadError,
      saveProduct,
      deleteProduct,
      moveStock,
      applyInventory,
      saveCustomer,
      createInvoice,
      convertQuote,
      deleteInvoice,
      clearAllHistory,
      resetDemo,
      clearAll,
    }),
    [db, ready, loadError, saveProduct, deleteProduct, moveStock, applyInventory, saveCustomer, createInvoice, convertQuote, deleteInvoice, clearAllHistory, resetDemo, clearAll]
  );

  return (
    <StoreCtx.Provider value={value}>
      {children}
      {loadError && (
        <div role="alert" className="no-print fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-4 text-sm font-medium text-rose-800 shadow-xl">
          {loadError}
        </div>
      )}
    </StoreCtx.Provider>
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return ctx;
}

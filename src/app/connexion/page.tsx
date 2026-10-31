"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, RotateCcw, UserRound } from "lucide-react";
import { shop } from "@/config/shop";
import { Logo } from "@/components/Logo";
import { finishPasswordRecovery, loginUser, resetAdminAccess, restoreAuthSession } from "@/lib/auth";
import { isSupabaseConfigured, requireSupabase } from "@/lib/supabase";

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("L’authentification Supabase n’est pas encore configurée.");
      return;
    }
    let active = true;
    const client = requireSupabase();
    const recoveryLink = new URLSearchParams(window.location.search).get("recovery") === "1";
    setRecovering(recoveryLink);
    const { data: listener } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && active) {
        setRecovering(true);
        setShowRecovery(false);
        setInfo("Choisissez un nouveau mot de passe.");
      }
    });
    restoreAuthSession()
      .then((session) => {
        if (active && session && !recoveryLink) router.replace("/admin");
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Impossible de vérifier la session.");
      });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (recovering) {
        if (newPassword !== confirmPassword) {
          setError("Les deux nouveaux mots de passe ne correspondent pas.");
          return;
        }
        await finishPasswordRecovery(newPassword);
        router.replace("/admin");
        return;
      }
      const session = await loginUser(email, password);
      if (!session) {
        setError("Identifiant ou mot de passe incorrect.");
        setPassword("");
        return;
      }
      router.push("/admin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion impossible. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const recoverAdmin = async () => {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await resetAdminAccess(email);
      setInfo("Si cette adresse correspond au compte gérant, un lien de réinitialisation lui sera envoyé.");
      setShowRecovery(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Réinitialisation impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-900 to-brand-600 p-4">
      <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={error ? { x: [0, -10, 10, -6, 6, 0], opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: error ? 0.4 : 0.5 }}
        key={String(Boolean(error))}
        className="relative w-full max-w-sm rounded-3xl border border-white/60 bg-white/95 p-7 shadow-2xl shadow-blue-950/25 backdrop-blur-xl"
      >
        <div className="flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-4 text-xl font-extrabold text-slate-900">Espace gérant</h1>
          <p className="text-sm text-slate-500">{shop.name}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Accès réservé au gérant autorisé. Les clients peuvent consulter la vitrine sans se connecter.
          </p>
        </div>
        {!recovering && (
          <>
            <label htmlFor="email" className="label mt-6">Adresse e-mail</label>
            <div className="relative">
              <UserRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre adresse e-mail"
                className="input !pl-10"
              />
            </div>
            <label htmlFor="password" className="label mt-4">Mot de passe</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="input !pl-10"
              />
            </div>
          </>
        )}
        {recovering && (
          <>
            <p className="mt-6 text-sm text-slate-600">Choisissez un nouveau mot de passe sécurisé.</p>
            <label htmlFor="new-password" className="label mt-4">Nouveau mot de passe</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" />
            <label htmlFor="confirm-password" className="label mt-4">Confirmer le mot de passe</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" />
          </>
        )}
        {error && <p role="alert" className="mt-3 text-center text-sm font-medium text-rose-600">{error}</p>}
        {info && <p role="status" className="mt-3 text-center text-sm text-emerald-700">{info}</p>}
        <button type="submit" disabled={busy} className="btn-primary mt-5 w-full !py-3">
          {busy ? "Veuillez patienter…" : recovering ? "Enregistrer le nouveau mot de passe" : "Se connecter"}
        </button>
        {!recovering && <div className="mt-4 border-t border-slate-100 pt-4 text-center">
          {!showRecovery ? (
            <button type="button" onClick={() => setShowRecovery(true)} className="text-sm font-semibold text-brand-700 hover:text-brand-900">
              Mot de passe oublié ?
            </button>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left">
              <p className="text-xs leading-relaxed text-amber-900">
                Un lien de réinitialisation sera envoyé à l’adresse du compte gérant.
              </p>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => setShowRecovery(false)} className="btn-ghost !px-3 !py-2 text-xs">Annuler</button>
                <button type="button" disabled={busy || !email} onClick={recoverAdmin} className="btn-primary !px-3 !py-2 text-xs">
                  <RotateCcw size={14} /> Envoyer le lien
                </button>
              </div>
            </div>
          )}
        </div>}
        <Link href="/" className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-700">
          <ArrowLeft size={14} /> Retour à la boutique
        </Link>
      </motion.form>
    </div>
  );
}

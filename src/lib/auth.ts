import { requireSupabase } from "@/lib/supabase";

export type UserRole = "admin";

export interface AuthSession {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

async function toAdminSession(userId: string, email: string, name?: string): Promise<AuthSession | null> {
  const client = requireSupabase();
  const { data: isAdmin, error } = await client.rpc("is_shop_admin");
  if (error) throw new Error(`Vérification des droits impossible : ${error.message}`);
  if (!isAdmin) return null;
  return { id: userId, username: email, name: name || email, role: "admin" };
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.email) return null;
  return toAdminSession(data.user.id, data.user.email, data.user.user_metadata.name);
}

export async function restoreAuthSession(): Promise<AuthSession | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error(`Vérification de la session impossible : ${error.message}`);
  const user = data.session?.user;
  if (!user?.email) return null;
  const session = await toAdminSession(user.id, user.email, user.user_metadata.name);
  if (!session) {
    await client.auth.signOut();
    return null;
  }
  return session;
}

export async function loginUser(email: string, password: string): Promise<AuthSession | null> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    if (error.message === "Invalid login credentials") return null;
    if (error.status === 429 || error.code?.includes("rate_limit")) {
      throw new Error("Trop de tentatives de connexion. Réessayez dans quelques minutes.");
    }
    throw new Error(`Connexion impossible : ${error.message}`);
  }
  if (!data.user.email) {
    await client.auth.signOut();
    return null;
  }
  const session = await toAdminSession(data.user.id, data.user.email, data.user.user_metadata.name);
  if (!session) {
    await client.auth.signOut();
    throw new Error("Ce compte n’est pas autorisé à gérer cette boutique.");
  }
  return session;
}

export async function resetAdminAccess(email: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/connexion?recovery=1`,
  });
  if (error) throw new Error(`Envoi du lien de réinitialisation impossible : ${error.message}`);
}

export async function finishPasswordRecovery(password: string): Promise<void> {
  if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error(`Modification du mot de passe impossible : ${error.message}`);
}

export async function changeOwnPassword(session: AuthSession, currentPassword: string, newPassword: string) {
  if (newPassword.length < 8) throw new Error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
  const client = requireSupabase();
  const { error: signInError } = await client.auth.signInWithPassword({
    email: session.username,
    password: currentPassword,
  });
  if (signInError) throw new Error("Le mot de passe actuel est incorrect.");
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw new Error(`Modification du mot de passe impossible : ${error.message}`);
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw new Error(`Déconnexion impossible : ${error.message}`);
}

import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      { error: "La connexion Supabase n’est pas configurée." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await client.rpc("get_public_products");

    if (error) {
      console.error("Chargement du catalogue public Supabase impossible.", error);
      return Response.json(
        { error: "Chargement du catalogue public impossible." },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    return Response.json(Array.isArray(data) ? data : [], {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Connexion au catalogue public Supabase impossible.", error);
    return Response.json(
      { error: "Connexion au catalogue public impossible." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

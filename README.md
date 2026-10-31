# Plateforme de gestion de boutique (Next.js)

Vitrine publique (produits, commande WhatsApp, appel, code QR) + espace gérant
(produits, gestion du stock, inventaires et historique des mouvements séparés, factures/devis imprimables, clients, chiffre d'affaires).
La configuration par défaut est orientée vente de produits électroniques : téléphones,
audio, informatique, chargeurs et accessoires.
Les factures et devis affichent un total unique sans TVA ni acompte.

## Démarrer
```bash
npm install
npm run dev      # http://localhost:3000 (configurez d'abord .env.local)
npm run build && npm start   # production
```

## Configuration Supabase

L'authentification et les données de la boutique sont stockées dans Supabase. Le catalogue public utilise une fonction SQL qui ne renvoie pas les prix d'achat ni les données des clients.

1. Dans le projet Supabase, ouvrez **SQL Editor**, collez le contenu de `supabase/migrations/202610310001_initial.sql` et exécutez-le.
2. Dans **Authentication → Providers**, activez Email et désactivez les inscriptions publiques.
3. Dans **Authentication → Users**, créez l'utilisateur gérant avec son adresse réelle et un mot de passe fort, puis confirmez son adresse e-mail.
4. Dans **SQL Editor**, autorisez ce compte comme administrateur en remplaçant `manager@example.com` par son adresse :

   ```sql
   insert into public.shop_admins (user_id)
   select id from auth.users where email = 'manager@example.com'
   on conflict (user_id) do nothing;
   ```

5. Dans **Authentication → URL Configuration**, ajoutez `http://localhost:3000/connexion?recovery=1` aux URL de redirection. Ajoutez aussi l'URL de production après la création du site Vercel.
6. Copiez `.env.example` vers `.env.local` et renseignez le Project URL et la clé publishable Supabase. Ne mettez jamais une clé `service_role` dans l'application.
7. Au premier accès gérant avec une base encore vide, les données déjà présentes dans le navigateur sont migrées vers Supabase. Faites une sauvegarde de ces données avant ce premier accès.

## Déploiement Vercel

1. Importez `ThiernoAmadouBa/project_boutique` dans Vercel et nommez le projet `ousmanetech`.
2. Dans **Settings → Environment Variables**, configurez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` avec les mêmes valeurs que `.env.local`.
3. Déployez la branche `main`, puis ajoutez l'URL de production Vercel aux URL de redirection Supabase avant d'utiliser la récupération de mot de passe.

Les données sont partagées entre les navigateurs via Supabase. Les produits publics sont servis séparément des données réservées au compte gérant.

## Personnaliser (`src/config/shop.ts`)
- Nom, slogan, contacts du gérant, adresse, NINEA et RCCM
- **Logo** : le logo OUSMATECH est fourni dans `public/ousmatech-logo.png` ; modifiez `logo` pour utiliser une autre image.

## Important
- Produits, stocks, clients, factures et mouvements sont partagés via Supabase ; la connexion gérant utilise Supabase Auth.
- Le premier compte autorisé est le gérant ajouté à `shop_admins`. L'ajout d'autres comptes nécessite de les créer dans Supabase Auth et de les autoriser en base.
- L'espace gérant est réservé aux comptes autorisés dans `shop_admins` ; les autres visiteurs sont renvoyés vers la connexion et ne peuvent pas lire ni modifier les données privées. Les tentatives de connexion sont soumises aux limites de débit de Supabase Auth. Laissez les inscriptions publiques désactivées et ne partagez jamais les identifiants du gérant.
- Si Supabase ne contient encore aucune donnée, le premier accès gérant importe la copie locale de ce navigateur. Les appareils des autres utilisateurs ne sont pas importés automatiquement.
- Le bouton de réinitialisation de démonstration remplace les données par des exemples ; « Tout supprimer » vide la boutique.
- « Excel » exporte un CSV ; le PDF de facture/devis intègre le logo de la boutique et un QR code pointant vers son adresse publique.

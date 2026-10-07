# Installer Grossesse Marina

Comptez une vingtaine de minutes, une seule fois. Tout est gratuit.

L'appli marche déjà sans rien configurer, mais les données restent alors sur un seul téléphone. Les étapes ci-dessous ajoutent :

- la **synchronisation** entre vos deux téléphones (Firebase, de Google) ;
- l'**assistante IA** (Gemini, de Google, via un petit serveur Cloudflare qui cache la clé).

---

## 1. Mettre l'appli en ligne (GitHub Pages)

1. Sur GitHub, ouvrez le dépôt `florianh-yezh/test` → **Settings** → **Pages**.
2. Dans **Source**, choisissez **Deploy from a branch**, puis la branche `ccr-276ffb08-7divet` (ou `main` une fois fusionnée) et le dossier `/ (root)`. Cliquez sur **Save**.
3. Après une minute environ, l'appli est disponible à l'adresse :
   **https://florianh-yezh.github.io/test/grossesse-marina/**

> GitHub Pages n'est gratuit que pour un dépôt **public**. Les données ne sont pas dans le dépôt (elles sont dans Firebase), mais si vous préférez un dépôt privé, il faut un compte GitHub payant ou un autre hébergeur (Netlify et Cloudflare Pages ont des offres gratuites).

## 2. Créer la base partagée (Firebase)

1. Allez sur https://console.firebase.google.com → **Créer un projet**, nommé par exemple `grossesse-marina`. Google Analytics n'est pas nécessaire.
2. **Créer l'application web** : sur la page d'accueil du projet, cliquez sur l'icône `</>` (« Web »), donnez-lui un nom, **ne cochez pas** Hosting et validez. Firebase affiche un bloc `const firebaseConfig = { apiKey: "...", ... }`. Gardez-le de côté pour l'étape 4.
3. **Activer la connexion Google** : menu **Authentication** → **Commencer** → onglet **Sign-in method** → **Google** → activer → choisissez votre adresse comme adresse d'assistance → **Enregistrer**.
4. **Autoriser le site** : toujours dans Authentication → onglet **Paramètres** → **Domaines autorisés** → **Ajouter un domaine** : `florianh-yezh.github.io`.
5. **Créer la base** : menu **Firestore Database** → **Créer une base de données** → emplacement `eur3 (europe-west)` → **démarrer en mode production**.
6. **Protéger la base** : onglet **Règles** de Firestore. Remplacez tout le contenu par celui du fichier [`firestore.rules`](firestore.rules), mettez **vos deux adresses Gmail** à la place des adresses d'exemple, puis cliquez sur **Publier**.

## 3. Brancher l'assistante (Gemini + Cloudflare)

1. **Clé Gemini gratuite** : sur https://aistudio.google.com/apikey → **Create API key** → choisissez le projet Firebase créé plus haut. Copiez la clé.
   > Avec l'offre gratuite, Google peut utiliser les questions posées pour améliorer ses produits, et le nombre de questions par jour est limité. Évitez d'y écrire des informations médicales très personnelles.
2. **Compte Cloudflare** : créez un compte gratuit sur https://dash.cloudflare.com.
3. **Créer le worker** : **Workers & Pages** → **Create** → **Create Worker** → nommez-le `grossesse-ia` → **Deploy**. Ensuite **Edit code** : effacez tout, collez le contenu de [`worker/assistant.js`](worker/assistant.js) et cliquez sur **Deploy**.
4. **Réglages du worker** : onglet **Settings** → **Variables and Secrets** → **Add** :

   | Nom | Type | Valeur |
   |---|---|---|
   | `GEMINI_API_KEY` | **Secret** | la clé Gemini |
   | `FIREBASE_PROJECT_ID` | Text | le `projectId` du bloc firebaseConfig |
   | `ALLOWED_EMAILS` | Text | `vous@gmail.com,marina@gmail.com` |
   | `ALLOWED_ORIGINS` | Text | `https://florianh-yezh.github.io` |

5. Notez l'adresse du worker, du type `https://grossesse-ia.votre-nom.workers.dev`.

## 4. Remplir `config.js`

Sur GitHub, ouvrez `grossesse-marina/config.js`, cliquez sur le crayon (modifier) et complétez :

```js
window.GM_CONFIG = {
  firebase: { apiKey: "…", authDomain: "…", projectId: "…", storageBucket: "…", messagingSenderId: "…", appId: "…" },
  allowedEmails: ["vous@gmail.com", "marina@gmail.com"],
  foyer: "marina",
  assistantUrl: "https://grossesse-ia.votre-nom.workers.dev"
};
```

Ces valeurs ne sont pas secrètes : c'est le fichier `firestore.rules` et le worker qui protègent l'accès. La clé Gemini, elle, ne doit **jamais** apparaître dans ce fichier.

Après chaque modification des fichiers de l'appli, augmentez aussi le numéro de `VERSION` dans `sw.js` (`gm-v2` → `gm-v3`) pour que les téléphones récupèrent la mise à jour.

## 5. Installer sur les téléphones Android

1. Ouvrez **https://florianh-yezh.github.io/test/grossesse-marina/** dans **Chrome**.
2. Connectez-vous avec votre compte Google.
3. Touchez la tuile **« Installer l'appli »** sur l'accueil, ou menu ⋮ → **Installer l'application**.
4. L'icône « Grossesse » apparaît sur l'écran d'accueil. L'appli s'ouvre en plein écran et fonctionne aussi hors connexion : les modifications se synchronisent au retour du réseau.

Faites la même chose sur le téléphone de Marina, avec son compte Google.

---

### En cas de souci

| Message | Solution |
|---|---|
| « Ce site n'est pas autorisé dans Firebase » | Ajoutez `florianh-yezh.github.io` aux domaines autorisés (étape 2.4). |
| « Accès refusé » après la connexion | L'adresse n'est pas dans `allowedEmails` (config.js) ou dans `firestore.rules`. |
| « Accès refusé par la base » | Les règles Firestore n'ont pas été publiées ou contiennent une faute de frappe dans une adresse. |
| L'assistante répond « Ce compte n'a pas accès » | Vérifiez `ALLOWED_EMAILS` dans le worker. |
| L'assistante répond « quota gratuit atteint » | La limite gratuite de Gemini est atteinte ; elle se réinitialise chaque jour. |
| Erreur 404 de l'assistante | Le modèle a peut-être changé de nom : ajoutez une variable `GEMINI_MODEL` dans le worker avec un nom de modèle listé sur https://ai.google.dev/gemini-api/docs/models |

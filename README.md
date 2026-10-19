# Stats TikTok · @zechromstore

Suivi des performances des vidéos TikTok : un dashboard en ligne (accessible depuis n'importe quel appareil) qui enregistre les stats directement dans ce dépôt, et Claude qui lit ces stats avant de proposer des idées.

## Contenu

| Fichier | Rôle |
|---|---|
| `index.html` | Le dashboard : graphiques et formulaire de saisie, enregistre directement sur GitHub |
| `data/videos.csv` | Une ligne par vidéo (nom, date/heure de publication, durée, format, accroche…) |
| `data/releves.csv` | Une ligne par relevé de stats (heure du relevé, vues, likes, partages, rétention…) |
| `CLAUDE.md` | Instructions pour Claude : récupérer les stats depuis GitHub et les analyser avant toute proposition |

## Comment ça marche

```
Téléphone / PC ──► dashboard (GitHub Pages) ──► enregistre dans data/*.csv sur GitHub
                                                           │
                                       Claude : git pull ◄─┘ puis analyse et propositions
```

## Installation (une seule fois)

### 1. Mettre le dashboard en ligne

1. Crée le dépôt sur github.com (**New repository**, par ex. `zechromstore-stats`) et envoie-y les fichiers du projet.
2. **Settings → Pages** → Source : *Deploy from a branch* → Branch : `main`, dossier `/ (root)` → **Save**.
3. Après une minute environ, le dashboard est en ligne à l'adresse `https://<ton-pseudo>.github.io/zechromstore-stats/`. Ajoute-le à l'écran d'accueil de ton téléphone.

> ⚠️ Avec un compte GitHub gratuit, GitHub Pages ne fonctionne qu'avec un dépôt **public**. N'importe qui ayant l'adresse peut alors voir tes stats. Pour garder un dépôt privé avec Pages, il faut GitHub Pro.

### 2. Créer le jeton qui permet au dashboard d'enregistrer

1. GitHub → photo de profil → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Nom : `dashboard tiktok`. Expiration : selon ton choix (1 an par ex.).
3. **Repository access** : *Only select repositories* → choisis uniquement `zechromstore-stats`.
4. **Permissions → Repository permissions → Contents** : *Read and write*.
5. Génère le jeton et copie-le.
6. Sur le dashboard, ouvre **Connexion GitHub**, colle le jeton et clique sur **Enregistrer**. Fais-le une fois sur chaque appareil.

Le jeton est gardé uniquement dans le navigateur de l'appareil, jamais dans le dépôt. Ne le partage pas. S'il fuit, supprime-le sur GitHub et crée-en un nouveau.

### 3. Lier le projet à Claude

Le dossier du projet sur ton ordinateur doit être une copie (clone) du dépôt GitHub. Claude fait alors un `git pull` avant chaque analyse et lit toujours les dernières stats saisies depuis le dashboard.

## Utilisation au quotidien

- **Saisir** : sur le dashboard, utilise *Nouvelle vidéo* à la publication, puis *Nouveau relevé* à chaque fois que tu relèves les stats. Chaque ajout est enregistré tout de suite sur GitHub.
- **Conseil** : fais tes relevés à heures fixes après la publication (+1 h, +24 h, +72 h, +7 j) pour pouvoir comparer les vidéos à âge égal.
- **Demander des idées à Claude** : « Propose-moi 3 vidéos pour cette semaine », « Quel format marche le mieux ? », « À quelle heure publier ? ». Claude récupère les stats, les analyse et justifie chaque proposition avec tes chiffres.

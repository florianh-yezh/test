// Réglages de connexion de l'appli.
// Tant que "firebase.apiKey" est vide, l'appli fonctionne en local (données sur le téléphone uniquement).
// Voir INSTALLATION.md pour savoir où trouver chaque valeur.
window.GM_CONFIG = {
  // Bloc « firebaseConfig » copié depuis la console Firebase (Paramètres du projet → Vos applications → Web).
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },
  // Adresses Google autorisées (la vraie protection est dans firestore.rules et dans le worker).
  allowedEmails: [],
  // Identifiant du « foyer » dans la base : toutes vos données sont rangées sous foyers/<foyer>/...
  foyer: "marina",
  // Adresse du worker Cloudflare qui appelle Gemini (ex. "https://grossesse-ia.monnom.workers.dev").
  assistantUrl: ""
};

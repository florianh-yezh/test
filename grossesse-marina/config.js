// Réglages de connexion de l'appli.
// Tant que "firebase.apiKey" est vide, l'appli fonctionne en local (données sur le téléphone uniquement).
// Voir INSTALLATION.md pour savoir où trouver chaque valeur.
window.GM_CONFIG = {
  // Bloc « firebaseConfig » copié depuis la console Firebase (Paramètres du projet → Vos applications → Web).
  firebase: {
    apiKey: "AIzaSyBtNtvlSo5hbQIreeD8CHS68UXTPflcfrU",
    authDomain: "grossesse-marina-8da5c.firebaseapp.com",
    projectId: "grossesse-marina-8da5c",
    storageBucket: "grossesse-marina-8da5c.firebasestorage.app",
    messagingSenderId: "122972335752",
    appId: "1:122972335752:web:4691a6c9e38cbe161f393d"
  },
  // Adresses Google autorisées (la vraie protection est dans firestore.rules et dans le worker).
  allowedEmails: [],
  // Identifiant du « foyer » dans la base : toutes vos données sont rangées sous foyers/<foyer>/...
  foyer: "marina",
  // Adresse du worker Cloudflare qui appelle Gemini (ex. "https://grossesse-ia.monnom.workers.dev").
  assistantUrl: ""
};

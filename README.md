# Kortado

Site de l’agence Kortado (Google Ads & LinkedIn, Lyon), hébergé sur Netlify (déploiement automatique à chaque push sur `main`).

## Pages

| Fichier | Adresse |
|---|---|
| index.html | / |
| google-ads.html | /google-ads |
| linkedin.html | /linkedin |
| agence.html | /agence |
| cas-clients.html | /cas-clients |
| contact.html | /contact |
| cas-paul.html, cas-clement.html, cas-spa.html, cas-team-building-rse.html, cas-recyclage.html | études de cas |
| mentions-legales.html, confidentialite.html | pages légales |
| guide-linkedin.html, merci-guide.html | lead magnet « Vole ma méthode LinkedIn » (formulaire puis page de téléchargement) |
| 404.html | page introuvable |

## Comment c’est construit

- Chaque page garde le gabarit issu de Claude Design dans `<template id="dc-tpl">` et sa logique dans le dernier `<script>`.
  `js/dc-lite.js` fait le rendu (liaisons `{{…}}`, `sc-if`, `sc-for`, clics).
- **Pour modifier un texte : le changer dans le `<template>`**, puis relancer `outils/prerender.py` (le contenu de `#dc-root` n’est qu’une copie pour le SEO).
- Images dans `images/` : kelian.png, robin.png, duo.png, tasse.png, tasse-agence.png, sticker-le-cool.png, sticker-graphique.png, sticker-accueil.png.
- Formulaires : Netlify Forms (`formulaires.html` déclare `rendez-vous`, `methode-12-etapes`, `ressource-google-ads`, `analyse-pdf`, `guide-linkedin`). Les réponses arrivent dans Netlify › Forms.
- Guide LinkedIn : le PDF est dans `ressources/guide-linkedin-kortado.pdf` (non indexé, voir `netlify.toml`). Pour le mettre à jour, remplacer le fichier en gardant le même nom.

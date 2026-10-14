# Site villeconnectos.com

Le site vitrine est hébergé sur Cloudflare Pages (projet `villeconnectos-landing`, déploiement par envoi de fichiers).
La page d'accueil en ligne n'est pas dans ce dépôt ; ce dossier contient les pages ajoutées :

- `confidentialite.html` → https://villeconnectos.com/confidentialite
- `mentions-legales.html` → https://villeconnectos.com/mentions-legales

Mise en ligne : Cloudflare → Workers & Pages → `villeconnectos-landing` → Create deployment →
envoyer le zip complet du site (page d'accueil, images `brand/`, ces deux pages, `sitemap.xml`, `_redirects`).
Un envoi remplace tout le site : le zip doit toujours contenir l'ensemble des fichiers.

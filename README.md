# sentry-sourcemaps

We need to upload our sourcemaps to Sentry (starting Sentry 8) with each release
of our app.

## Motivation

## How it works

- Créer le projet en ligne sur le Sentry
  > besoin d'une API key
    cf https://docs.getsentry.com/hosted/clients/javascript/sourcemaps/#uploading-source-maps-to-sentry

- Récupérer un package donné (NOM + VERSION) , eventuellement depuis un REGISTRY donné
- Télécharger le package en question
  > utiliser require('npm') et  http://stackoverflow.com/questions/20686244/install-programmatically-a-npm-package-providing-its-version
- Parcourir le contenu et mettre en ligne tous les fichiers MAP
  > walk le dossier, gogogo
- Parcourir chaque fichier MAP et mettre en ligne tous les fichiers source
  > http://billpatrianakos.me/blog/2015/06/05/making-raw-http-requests-in-node/
- Eventuellement ne pas inclure tout fichier provenant de node_modules (OPTION)

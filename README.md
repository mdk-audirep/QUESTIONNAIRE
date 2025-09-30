# QuestionnaireMasterPIE

Application web full-stack permettant de générer des questionnaires d'études de marché conformément au protocole QuestionnaireMasterPIE.

## Structure du projet

```
.
├── client/   # Front-end React + Vite
├── server/   # API Express + OpenAI Responses
├── .env      # Variables d'environnement (non versionné)
└── README.md
```

## Prérequis
- Node.js 18+
- npm 9+
- Compte OpenAI avec accès à l'API `gpt-5-mini`

## Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet (il est ignoré par Git) :

```
OPENAI_API_KEY=sk-********************************
VECTOR_STORE_ID=vs_********************************
PORT=8080
```

Les variables sont lues dans l'ordre suivant :
1. Variables d'environnement de l'OS
2. Fichier `.env`

Si `OPENAI_API_KEY` ou `VECTOR_STORE_ID` est absent, l'API renvoie une erreur 503 et bloque toute tentative d'appel à OpenAI.

## Installation

```
npm install
npm run install:all
```

## Lancer l'application en développement

```
npm run dev
```

Cette commande démarre simultanément :
- l'API Express sur `http://localhost:8080`
- le front-end Vite sur `http://localhost:5173`

La configuration de Vite proxifie automatiquement les requêtes `/api` vers le serveur Express.

## Scripts utiles

- `npm run build` : construit le front-end pour la production
- `npm run lint` : exécute ESLint sur le front-end

## Fonctionnalités principales

- **Protocoles /start, /continue, /final** : respect du flux imposé par le prompt (envoi du prompt système uniquement au démarrage, mémoire compressée, et overrides `verbosity`/`max_output_tokens` pour l'assemblage final).
- **Mémoire structurée** : fusion des deltas fournis par le front et maintien d'un résumé compact (≤5 tours verbatim) pour reconstituer le contexte côté serveur.
- **Gestion des étapes** : détection heuristique de la phase dans les réponses (collecte, plan, sections, final) et propagation au client.
- **Sécurité des secrets** : validation au démarrage, aucun secret exposé côté client.
- **UI spécialisée** : sélection hiérarchique thématiques/sous-thématiques avec ajouts libres, bouton unique `Envoyer`, bouton `Démarrer / Réinitialiser`, rendu Markdown sécurisé, stockage automatique du Markdown final dans `<input type="hidden" id="finalMarkdown">`.

## Tests

Aucun test automatisé n'est fourni. Utilisez les tests d'acceptation décrits dans le prompt pour valider l'implémentation.

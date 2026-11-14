# TRACE

Jeu de rôle solo pour macOS, Windows et Linux. Vous écrivez ce que fait votre
personnage ; un maître du jeu vous répond, lance les dés et fait vivre le monde
autour de vous.

**Page de présentation et de téléchargement : <https://vlefils.github.io/trace-releases/>**

## Télécharger

Les paquets sont dans les [versions publiées](https://github.com/vlefils/trace-releases/releases/latest) :

| Ordinateur | Fichier |
|---|---|
| Mac à puce Apple (M1 et suivantes) | `TRACE-macOS-arm64.dmg` |
| Mac à processeur Intel | `TRACE-macOS-x86_64.dmg` |
| Windows 10 ou 11, 64 bits | `TRACE-windows-x86_64.zip` |
| Linux 64 bits, glibc 2.35 ou plus récente | `TRACE-linux-x86_64.tar.gz` |

## Ce qu'il faut

- Un assistant en ligne de commande, installé et connecté à votre compte :
  **Codex CLI** ou **Claude Code**. Le maître du jeu passe par lui.
- Une connexion Internet pendant le jeu.

Avec Codex, le jeu génère des illustrations de scène et des portraits. **Avec
Claude Code, le jeu est le même mais ne génère aucun visuel.**

Le guide d'installation, à la main ou avec un prompt à donner à un agent de code,
se trouve sur la page.

## Ce dépôt

Il contient uniquement la page (`index.html`, `styles.css`, `app.js`, `assets/`)
et les paquets publiés. Les applications ne sont pas signées : au premier
lancement, macOS et Windows demandent une autorisation, expliquée dans le guide.

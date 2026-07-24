# @w10k/platform

**The command-line tool that pulls the w10k platform into your project — a luxury website builder for freelancers and studios.**

[![npm](https://img.shields.io/npm/v/@w10k/platform)](https://www.npmjs.com/package/@w10k/platform)

One command pulls the entire w10k platform into any project directory: a **300+ design-taste reference library**, **20+ luxury templates**, the design system, the industry recipes, and the deploy pipeline. It runs inside your AI coding agent (Cursor, Windsurf, Claude Code) so you go from a client brief to a shipped `$10k+` site in a fraction of the usual time.

- 🌐 **Website** — [studio.w10k.net](https://studio.w10k.net/)
- 📦 **npm** — [@w10k/platform](https://www.npmjs.com/package/@w10k/platform)
- ✉️ **Support** — [studio@w10k.net](mailto:studio@w10k.net)

---

## What you get

| | |
| --- | --- |
| **Design tastes** | 300+ structured design references — typography, color, motion and layout DNA — grep-selectable at build time. |
| **Templates** | 20+ zero-build luxury templates (hotel, restaurant, spa, fashion, clinic…). Open one and it runs. |
| **Knowledge base** | Distilled luxury-design principles, motion craft, and a build protocol with a hard QA bar. |
| **Skills** | Operating verbs for the client lifecycle — crawl an old site, ship a new one, upgrade it, deploy it. |
| **Deploy pipeline** | Config and conventions to take a finished site to a live preview. |

## Install & use

No install needed — run it with `npx` in any project directory:

```bash
# Download the full platform into the current directory
npx @w10k/platform pull --key=<your-license-key>

# Merge the latest core (catalog, knowledge, recipes, skills) — keeps your personal layer
npx @w10k/platform update --key=<your-license-key>

# Check your license status and plan
npx @w10k/platform info --key=<your-license-key>
```

Your license key arrives by email right after purchase. Get one at **[studio.w10k.net](https://studio.w10k.net/)**.

### Commands

| Command | What it does |
| --- | --- |
| `pull` | Downloads the full w10k platform into the current directory. |
| `update` | Merges the latest core layer while preserving your personal changes. |
| `info` | Shows license status and plan details. |
| `--help` | Prints usage. |

### Options

| Option | Description |
| --- | --- |
| `--key` | Your license key (received by email after purchase). Required for `pull`, `update`, `info`. |

## Requirements

- **Node.js ≥ 18**
- A valid w10k license key

## How licensing works

`@w10k/platform` is the open, public CLI — it's free to install and inspect. It validates your key and streams the platform to you through our download proxy. The **platform content itself** (templates, design tastes, knowledge base) is proprietary and delivered under license. See the full [Terms of Service](https://studio.w10k.net/terms/) and [Privacy Policy](https://studio.w10k.net/privacy/).

Once pulled, every client site you build is **yours to keep, sell and deliver**. One license, unlimited projects. You may not resell or redistribute the platform itself.

## Support

Questions, license issues, or a bug in the CLI? Email **[studio@w10k.net](mailto:studio@w10k.net)** or open an issue.

---

© 2026 w10k · [studio.w10k.net](https://studio.w10k.net/)

# aur-packages

PKGBUILDs for the [Arch User Repository](https://aur.archlinux.org/packages?K=pen-pal&SeB=m) packages I maintain. CI builds and tests every package in a clean Arch container and publishes new upstream releases automatically.

## Packages

| Package | Upstream | Description |
|---|---|---|
| [agentcore-cli-bin](https://aur.archlinux.org/packages/agentcore-cli-bin) | [aws/agentcore-cli](https://github.com/aws/agentcore-cli) | Create, develop and deploy agents to Amazon Bedrock AgentCore |
| [artex-bin](https://aur.archlinux.org/packages/artex-bin) | [BaaRai/ARTEX](https://github.com/BaaRai/ARTEX) | AI autonomous penetration testing system with a web UI (server, skills and browser clients) |
| [caveman-bin](https://aur.archlinux.org/packages/caveman-bin) | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) | Make AI coding agents talk like cavemen, plus local context and guidance |
| [ctfkit](https://aur.archlinux.org/packages/ctfkit) | [compliancetf/ctfkit](https://github.com/compliancetf/ctfkit) | Run the same Terraform and OpenTofu compliance checks across pipelines |
| [func-e](https://aur.archlinux.org/packages/func-e) | [tetratelabs/func-e](https://github.com/tetratelabs/func-e) | Download and run Envoy proxy versions |
| [github-dorks-git](https://aur.archlinux.org/packages/github-dorks-git) | [techgaun/github-dorks](https://github.com/techgaun/github-dorks) | Find leaked secrets with GitHub code search |
| [gpu-mcp-server](https://aur.archlinux.org/packages/gpu-mcp-server) | [pmady/gpu-mcp-server](https://github.com/pmady/gpu-mcp-server) | MCP server exposing NVIDIA GPU utilization, memory, temperature and process data |
| [kicad-routing-tools](https://aur.archlinux.org/packages/kicad-routing-tools) | [drandyhaas/KiCadRoutingTools](https://github.com/drandyhaas/KiCadRoutingTools) | Rust-accelerated autorouter and routing tools for KiCad |
| [kubectl-ate](https://aur.archlinux.org/packages/kubectl-ate) | [agent-substrate/substrate](https://github.com/agent-substrate/substrate) | kubectl plugin for Agent Substrate, the Kubernetes platform for AI agents |
| [obsidian-anysocket-sync-server](https://aur.archlinux.org/packages/obsidian-anysocket-sync-server) | [lynxaegon/obsidian-anysocket-sync-server](https://github.com/lynxaegon/obsidian-anysocket-sync-server) | Self-hosted synchronization server for Obsidian |
| [paccor-bin](https://aur.archlinux.org/packages/paccor-bin) | [nsacyber/paccor](https://github.com/nsacyber/paccor) | Platform Attribute Certificate Creator: gather components, create and sign attestations |
| [prime-agent-bin](https://aur.archlinux.org/packages/prime-agent-bin) | [PrimeIntellect-ai/prime-agent](https://github.com/PrimeIntellect-ai/prime-agent) | Self-improving coding agent |
| [shellfirm-bin](https://aur.archlinux.org/packages/shellfirm-bin) | [kaplanelad/shellfirm](https://github.com/kaplanelad/shellfirm) | Intercept risky shell patterns with configurable safety rules |
| [taskcat](https://aur.archlinux.org/packages/taskcat) | [aws-ia/taskcat](https://github.com/aws-ia/taskcat) | Test AWS CloudFormation templates by deploying them in multiple regions |
| [tfk8s-bin](https://aur.archlinux.org/packages/tfk8s-bin) | [jrhouston/tfk8s](https://github.com/jrhouston/tfk8s) | Convert Kubernetes YAML manifests to Terraform HCL |
| [zero-breach-toolkit-bin](https://aur.archlinux.org/packages/zero-breach-toolkit-bin) | [interplains/Zero-Breach-Toolkit](https://github.com/interplains/Zero-Breach-Toolkit) | Offline security checks for Linux environments |

Install with any AUR helper, e.g. `paru -S taskcat`.

## How updates work

A complete Mermaid overview is available in [`FLOW.md`](FLOW.md).

```
upstream release ──GitHub release email──▶ trigger/ (Cloudflare Worker) ──▶ AUR workflow
hourly cron (:17) ───────────────────────▶ trigger/ (Cloudflare Worker) ──▶ AUR workflow
```

[`.github/workflows/aur.yml`](.github/workflows/aur.yml) runs one job per package:

1. **Check:** compare the newest plain `vX.Y.Z` upstream release with `pkgver`. Unchanged packages are skipped.
2. **Build and test:** bump `pkgver`, reset `pkgrel`, refresh checksums, run `makepkg` in `archlinux:base-devel`, install the package and run its smoke test. namcap findings show up as annotations.
3. **Publish:** push `PKGBUILD`, `.SRCINFO` and helper files to the AUR first, then commit the bump here.

Pushes and pull requests that touch a `PKGBUILD` build and test every package; only pushes to `main` publish. `-git` packages follow upstream's branch, so they build on pushes, pull requests and forced runs.

```
gh workflow run AUR -f force=true
```

### Triggers

GitHub drops most scheduled workflow runs, and release webhooks are only available to upstream owners, so [`trigger/`](trigger) is a Cloudflare Worker that dispatches the workflow:

- **Email:** GitHub's notification email is routed to the Worker. A `[owner/repo] Release ...` email starts a check within seconds. Every email is forwarded on to the real inbox.
- **Cron:** hourly backstop.

Cloudflare redeploys it from this repo when `trigger/` changes on `main`. Secrets live in the Worker: `GH_TOKEN` (fine-grained, Actions read/write on this repo) and `FORWARD_TO`.

## Adding a package

1. Create `<pkgname>/` with `PKGBUILD`, `.SRCINFO` (`makepkg --printsrcinfo > .SRCINFO`) and any helper files. Upstream signing keys go in `keys/pgp/<fingerprint>.asc`.
2. Add it to the matrix in `aur.yml`: `pkg` (folder and AUR name), `upstream` (GitHub repo with releases) and `check` (smoke test command run after install).
3. On GitHub, watch the upstream repository with **Custom → Releases** so its release emails reach the trigger.

The AUR repository is created on first publish.

## Secrets

| Where | Name | Purpose |
|---|---|---|
| GitHub Actions | `AUR_SSH_PRIVATE_KEY` | SSH key registered on the AUR account; used only by the publish job |
| Cloudflare Worker | `GH_TOKEN`, `FORWARD_TO` | Dispatch the workflow; forward notification email |

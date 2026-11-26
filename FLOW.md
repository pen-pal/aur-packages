# Repository update and release flow

This diagram covers the release-trigger paths, package checks, isolated build/test stage, and publishing described in `.github/workflows/aur.yml` and `trigger/worker.js`.

```mermaid
flowchart TD
    subgraph Triggers[Workflow triggers]
        Release[Watched upstream GitHub release email] -->|forward to inbox; matching release notice| WorkerEmail[Cloudflare Worker email handler]
        WorkerEmail -->|workflow_dispatch on main; check-only| Dispatch[Dispatch AUR workflow]
        WorkerCron[Cloudflare Worker hourly cron] -->|workflow_dispatch on main; check-only| Dispatch
        NativeCron[GitHub Actions hourly schedule] --> Workflow[AUR workflow]
        Dispatch --> Workflow
        Manual[Manual workflow_dispatch] --> Workflow
        Push[Push to main touching */PKGBUILD or workflow] --> Workflow
        PR[Pull request touching */PKGBUILD or workflow] --> Workflow
    end

    Workflow --> Matrix[Run package matrix in parallel]
    Matrix --> Check{Package type and release check}
    Check -->|*-git on polling run| Skip[Skip package]
    Check -->|regular package: compare latest eligible upstream release with pkgver| Version{New release or build requested?}
    Version -->|No new release on polling/check-only run| Skip
    Version -->|New release| Bump[Bump pkgver; reset pkgrel]
    Version -->|Push/PR or forced/manual build| Prepare[Prepare package]
    Bump --> Prepare
    Prepare --> Deps[Install package build dependencies]
    Deps --> Checksums[Refresh checksums if version bumped]
    Checksums --> Keys[Import packaged PGP keys if present]
    Keys --> Build[Build with makepkg in archlinux:base-devel]
    Build --> SrcInfo[Regenerate .SRCINFO]
    SrcInfo --> Install[Install built package]
    Install --> Smoke[Run package-specific smoke test]
    Smoke --> Lint[Run namcap; report .SRCINFO drift as warning]
    Lint --> Artifact[Upload PKGBUILD and .SRCINFO artifact]

    Artifact --> PublishGate{Publish job allowed?}
    PublishGate -->|Pull request| NoPublish[Do not publish]
    PublishGate -->|Non-PR run and not cancelled| Download[Download artifacts from successful package builds]
    Download --> AUR[Clone package AUR repo and copy tracked helpers plus built PKGBUILD/.SRCINFO]
    AUR --> AURChanged{AUR files changed?}
    AURChanged -->|Yes| PushAUR[Commit and push to AUR master]
    AURChanged -->|No| RepoSync[Sync package metadata in this repository]
    PushAUR --> RepoSync
    RepoSync --> RepoChanged{Repository metadata changed?}
    RepoChanged -->|Yes| CommitRepo[Commit and push metadata to workflow branch]
    RepoChanged -->|No| Done[Finished]
    CommitRepo --> Done
    Skip --> PublishGate
```

Notes:
- The workflow's native schedule and the Worker cron both provide hourly checks; the Worker is a backstop because GitHub may delay or drop scheduled runs.
- The Worker forwards every notification email before checking whether it is a GitHub release notice. Matching notices dispatch a check-only run.
- Pull requests build and test but never publish. The publish job can publish packages that produced artifacts even if another matrix package failed.
- The AUR SSH key is only used in the publish job; that job downloads build artifacts and does not source or execute package `PKGBUILD` files.
- `*-git` packages follow their upstream branch and are skipped only for polling/check-only runs; they build on pushes, pull requests, and forced runs.

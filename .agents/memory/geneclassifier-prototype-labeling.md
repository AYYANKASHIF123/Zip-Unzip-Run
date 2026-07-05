---
name: GeneClassifier prototype labeling pattern
description: Convention for presenting unfinished/aspirational startup and research features honestly in this app.
---

When adding startup/SaaS or advanced-research feature pages to GeneClassifier, use the shared
`src/components/shared/{PageHeader,PrototypeBanner,ScoreCard}.tsx` building blocks rather than
inventing new header/banner styles per page.

**Why:** the project has a hard rule to never claim real clinical validation — every unfinished or
aspirational feature must be visibly labeled ("Prototype", "Demo", "Research Preview", or
"Production Planned"). Centralizing the badge colors and banner copy in shared components keeps
that labeling consistent across ~20+ pages instead of drifting per-author.

**How to apply:** readiness/maturity scores for different audiences (FYP, startup, research lab
pilot, SaaS, clinical) should be framed as *readiness estimates*, explicitly not guarantees of
success — clinical scores in particular should stay low (20-30%) since no real clinical validation
exists. Use `PrototypeBanner` tone="warning" for anything a reader could mistake as production-grade.

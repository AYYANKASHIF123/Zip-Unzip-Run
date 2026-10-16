---
name: GeneClassifier evaluation boundary
description: Preserve the active serving model and existing held-out evaluation when adding result-trust audits.
---

Evaluation audits must not retrain or replace active v2, change prediction behavior, or overwrite the original held-out evaluation results. Store new audit results alongside the existing evaluation.

**Why:** The user explicitly requires a separation between research checks and the currently served model/results.

**How to apply:** Keep evaluation and trust-check runs evaluation-only. Retrain v2, replace its serving artifact, alter predictions, or rewrite the original held-out metrics only when the user explicitly directs that change.

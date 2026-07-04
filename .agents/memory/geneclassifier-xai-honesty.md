---
name: GeneClassifier XAI honesty convention
description: Correct terminology for explainability/contribution scores in the GeneClassifier app — avoid overclaiming SHAP.
---

The classification service's per-gene "contribution" scores are computed as
`importance (MDI from the Random Forest) × (scaled_value − class_mean)`, not
true Shapley values.

**Why:** Labeling this "SHAP" or "SHAP-inspired" overstates the rigor of the
explainability method to a research/FYP audience that may scrutinize the
methodology. The project's existing pages (`xai.tsx`) already use the honest
label "MDI + Class-Mean Δ"; other legacy pages use qualified phrasing like
"SHAP-style (approximation)" or "not full SHAP" which is acceptable as long as
it's clearly flagged as an approximation.

**How to apply:** When adding new UI text, PDF exports, or docs that describe
this contribution/explainability mechanism, use "MDI + class-mean delta" (or
an equivalently qualified/approximate phrasing) — never present it as
unqualified "SHAP".

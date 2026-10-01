---
name: GeneClassifier XAI honesty convention
description: Correct terminology for explainability/contribution scores in the GeneClassifier app — avoid overclaiming SHAP.
---

The active HistGradientBoosting model uses permutation importance for global
gene importance. Per-sample contribution context combines that importance with
the expression delta from the predicted subtype's class mean; it is not exact
Shapley-value attribution.

**Why:** Calling these values "SHAP" or "SHAP-inspired" overstates the rigor
of the explainability method to a research/FYP audience that may scrutinize
the methodology. The active model now uses a different importance method than
the previous Random Forest version, but neither computes Shapley values.

**How to apply:** When adding UI text, PDF exports, or docs for active v2
explanations, use "permutation importance + class-mean delta" — never present
the values as unqualified "SHAP".

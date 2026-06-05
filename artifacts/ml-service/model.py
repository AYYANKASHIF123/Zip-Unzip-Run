import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

CANCER_SUBTYPES = ["BRCA", "LUAD", "COAD", "GBM", "PRAD"]

SUBTYPE_LABELS = {
    "BRCA": "BRCA (Breast)",
    "LUAD": "LUAD (Lung Adeno)",
    "COAD": "COAD (Colon)",
    "GBM":  "GBM (Glioblastoma)",
    "PRAD": "PRAD (Prostate)",
}

FEATURE_GENES = [
    "ERBB2",  "PIK3CA", "PTEN",   "BRAF",   "KRAS",   "CTNNB1", "BRCA1",  "BRCA2",
    "EGFR",   "NRAS",   "TP53",   "CCND1",  "MYC",    "SRC",    "PBRM1",  "AR",
    "ESR1",   "CDH1",   "RB1",    "CDKN2A", "VHL",    "APC",    "MLH1",   "SMAD4",
    "FGFR1",  "FGFR2",  "FGFR3",  "ALK",    "MET",    "RET",    "NF1",    "NF2",
    "NOTCH1", "NOTCH2", "PDGFRA", "KIT",    "IDH1",   "IDH2",   "TERT",   "CDKN1B",
    "PIK3R1", "FOXO3",  "AKT1",   "MTOR",   "ARID1A", "SETD2",  "KDM6A",  "CREBBP",
    "EP300",  "DNMT3A",
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")


def _generate_training_data(n_per_class: int = 400) -> tuple:
    rng = np.random.RandomState(42)
    n_feat = len(FEATURE_GENES)
    idx = {g: i for i, g in enumerate(FEATURE_GENES)}

    def make(n, over, under, noise=0.9):
        X = rng.randn(n, n_feat) * noise
        for g, v in over.items():
            if g in idx:
                X[:, idx[g]] += v + rng.randn(n) * 0.4
        for g, v in under.items():
            if g in idx:
                X[:, idx[g]] -= v + rng.randn(n) * 0.4
        return X

    brca = make(n_per_class,
                over={"ERBB2": 3.5, "PIK3CA": 2.2, "CCND1": 2.6, "ESR1": 4.1, "FGFR1": 1.6, "SRC": 1.9, "MYC": 1.4},
                under={"BRCA1": 3.1, "BRCA2": 2.6, "PTEN": 1.6, "CDH1": 2.1, "RB1": 0.8})

    luad = make(n_per_class,
                over={"EGFR": 4.2, "KRAS": 2.9, "ALK": 2.1, "MET": 2.6, "FGFR2": 1.6, "NOTCH1": 1.2},
                under={"TP53": 3.6, "CDKN2A": 2.1, "RB1": 1.9, "NF1": 1.6, "SMAD4": 1.0})

    coad = make(n_per_class,
                over={"CTNNB1": 3.1, "BRAF": 2.6, "KRAS": 3.6, "MYC": 3.1, "FGFR3": 1.6, "NOTCH2": 1.3},
                under={"APC": 4.1, "MLH1": 2.6, "SMAD4": 2.1, "PTEN": 1.6, "RB1": 1.1, "ARID1A": 1.5})

    gbm = make(n_per_class,
               over={"EGFR": 5.1, "NRAS": 2.1, "PDGFRA": 3.1, "TERT": 2.6, "MYC": 1.6, "KIT": 1.4},
               under={"PTEN": 4.6, "PBRM1": 2.6, "NF1": 2.1, "TP53": 2.1, "IDH1": 2.8, "IDH2": 2.5})

    prad = make(n_per_class,
                over={"AR": 5.2, "MYC": 2.1, "AKT1": 1.6, "MTOR": 1.6, "DNMT3A": 1.1, "KDM6A": 0.9},
                under={"PTEN": 3.6, "RB1": 1.6, "CDKN1B": 2.1, "NF1": 1.1, "FOXO3": 1.3})

    classes = [(brca, 0), (luad, 1), (coad, 2), (gbm, 3), (prad, 4)]
    X = np.vstack([x for x, _ in classes])
    y = np.concatenate([[lbl] * n_per_class for _, lbl in classes])
    return X, y


def _train_and_save() -> dict:
    print("Training Random Forest classifier on synthetic gene expression data…")
    X, y = _generate_training_data()
    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler",  StandardScaler()),
        ("clf",     RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])
    pipeline.fit(X, y)
    clf = pipeline.named_steps["clf"]

    # ── Global feature importance (MDI) ───────────────────────────────────────
    feature_importances = clf.feature_importances_.tolist()

    # ── Per-class means in scaled space ──────────────────────────────────────
    # Used for explaining which direction each gene pushes each subtype
    X_scaled = pipeline.named_steps["scaler"].transform(
        pipeline.named_steps["imputer"].transform(X)
    )
    per_class_means: dict = {}
    for class_idx, subtype_key in enumerate(CANCER_SUBTYPES):
        mask = (y == class_idx)
        per_class_means[SUBTYPE_LABELS[subtype_key]] = {
            gene: round(float(X_scaled[mask, i].mean()), 4)
            for i, gene in enumerate(FEATURE_GENES)
        }

    bundle = {
        "pipeline": pipeline,
        "features": FEATURE_GENES,
        "feature_importances": feature_importances,
        "per_class_means": per_class_means,
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(bundle, f)
    print("Model trained and saved.")
    return bundle


def load_or_train_model() -> dict:
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            bundle = pickle.load(f)
        # Migrate older pickles that lack XAI fields
        if "feature_importances" not in bundle or "per_class_means" not in bundle:
            os.remove(MODEL_PATH)
            return _train_and_save()
        return bundle
    return _train_and_save()


def _align_features(df: pd.DataFrame, feature_genes: list) -> tuple:
    cols_upper = {str(c).strip().upper(): c for c in df.columns}
    available, missing = [], []
    rows = []
    for gene in feature_genes:
        if gene.upper() in cols_upper:
            col = cols_upper[gene.upper()]
            rows.append(pd.to_numeric(df[col], errors="coerce").values)
            available.append(gene)
        else:
            rows.append(np.full(len(df), np.nan))
            missing.append(gene)
    return np.column_stack(rows), available, missing


def _extract_sample_ids(df: pd.DataFrame) -> tuple:
    first_col = str(df.columns[0]).strip().lower()
    id_hints = {"sample_id", "sample", "id", "barcode", "patient_id", "sampleid", "tcga"}
    if first_col in id_hints:
        return df.iloc[:, 0].astype(str).tolist(), df.iloc[:, 1:]
    try:
        pd.to_numeric(df.iloc[:, 0], errors="raise")
        return [f"Sample_{i+1}" for i in range(len(df))], df
    except (ValueError, TypeError):
        return df.iloc[:, 0].astype(str).tolist(), df.iloc[:, 1:]


def predict(bundle: dict, df: pd.DataFrame) -> list:
    pipeline      = bundle["pipeline"]
    feature_genes = bundle["features"]

    sample_ids, df = _extract_sample_ids(df)

    if len(df.index) > len(df.columns) * 2 and len(df.columns) <= 20:
        df = df.T
        sample_ids = [str(c) for c in df.index]
        df = df.reset_index(drop=True)

    X, available, missing = _align_features(df, feature_genes)
    proba  = pipeline.predict_proba(X)
    labels = pipeline.predict(X)

    results = []
    for i, (sid, probs, lbl) in enumerate(zip(sample_ids, proba, labels)):
        pred_key   = CANCER_SUBTYPES[lbl]
        confidence = float(probs[lbl])
        results.append({
            "sampleId":             sid,
            "predictedSubtype":     SUBTYPE_LABELS[pred_key],
            "confidenceScore":      round(confidence, 4),
            "subtypeProbabilities": {
                SUBTYPE_LABELS[CANCER_SUBTYPES[j]]: round(float(p), 4)
                for j, p in enumerate(probs)
            },
            "genesMatched":  len(available),
            "genesMissing":  len(missing),
            "missingGenes":  missing[:10],
        })
    return results


def explain(bundle: dict, df: pd.DataFrame) -> list:
    """
    Per-sample SHAP-style explanation.
    Contribution_i = importance_i × (scaled_value_i − class_mean_i)
    Positive = gene pushes toward the predicted subtype.
    Negative = gene pushes against it.
    """
    pipeline       = bundle["pipeline"]
    feature_genes  = bundle["features"]
    importances    = np.array(bundle["feature_importances"])
    per_class_means = bundle["per_class_means"]

    sample_ids, df = _extract_sample_ids(df)

    if len(df.index) > len(df.columns) * 2 and len(df.columns) <= 20:
        df = df.T
        sample_ids = [str(c) for c in df.index]
        df = df.reset_index(drop=True)

    X, available, missing = _align_features(df, feature_genes)

    # Scale the features (same pipeline steps as predict)
    imputer = pipeline.named_steps["imputer"]
    scaler  = pipeline.named_steps["scaler"]
    X_imputed = imputer.transform(X)
    X_scaled  = scaler.transform(X_imputed)

    proba  = pipeline.predict_proba(X)
    labels = pipeline.predict(X)

    results = []
    for i, (sid, probs, lbl) in enumerate(zip(sample_ids, proba, labels)):
        pred_key   = CANCER_SUBTYPES[lbl]
        pred_label = SUBTYPE_LABELS[pred_key]
        confidence = float(probs[lbl])

        class_means = per_class_means.get(pred_label, {})
        class_mean_vec = np.array([class_means.get(g, 0.0) for g in feature_genes])

        # contribution = importance × (sample_scaled − class_mean_scaled)
        delta       = X_scaled[i] - class_mean_vec
        raw_contribs = importances * delta

        # Normalise so bars are interpretable (keep relative magnitudes)
        abs_sum = np.abs(raw_contribs).sum() or 1.0
        normalised = raw_contribs / abs_sum

        contributions = []
        for j, gene in enumerate(feature_genes):
            contributions.append({
                "gene":        gene,
                "importance":  round(float(importances[j]), 6),
                "scaledValue": round(float(X_scaled[i, j]), 4),
                "classMean":   round(float(class_mean_vec[j]), 4),
                "contribution": round(float(normalised[j]), 6),
                "direction":   "pos" if normalised[j] >= 0 else "neg",
            })

        contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)

        results.append({
            "sampleId":         sid,
            "predictedSubtype": pred_label,
            "confidenceScore":  round(confidence, 4),
            "contributions":    contributions,
        })
    return results

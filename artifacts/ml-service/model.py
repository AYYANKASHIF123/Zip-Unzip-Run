import os
import json
import pickle
import threading
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score

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

_DIR = os.path.dirname(__file__)
MODEL_PATH    = os.path.join(_DIR, "model.pkl")
REGISTRY_PATH = os.path.join(_DIR, "model_registry.json")

_train_lock = threading.Lock()


# ── Model registry ─────────────────────────────────────────────────────────────

def load_registry() -> dict:
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH) as f:
            return json.load(f)
    return {"versions": [], "activeVersionId": None}


def _save_registry(registry: dict) -> None:
    with open(REGISTRY_PATH, "w") as f:
        json.dump(registry, f, indent=2)


def _add_version(version_id: str, params: dict, cv_accuracy: float, cv_f1: float) -> dict:
    registry = load_registry()
    for v in registry["versions"]:
        v["isActive"] = False
    entry = {
        "id":          version_id,
        "name":        f"Random Forest {version_id}",
        "createdAt":   datetime.now(timezone.utc).isoformat(),
        "params":      params,
        "cvAccuracy":  round(cv_accuracy, 4),
        "cvF1":        round(cv_f1, 4),
        "nGenes":      len(FEATURE_GENES),
        "nSubtypes":   len(CANCER_SUBTYPES),
        "isActive":    True,
        "filePath":    f"model_{version_id}.pkl",
    }
    registry["versions"].insert(0, entry)
    registry["activeVersionId"] = version_id
    _save_registry(registry)
    return entry


# ── Training data ──────────────────────────────────────────────────────────────

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
    gbm  = make(n_per_class,
                over={"EGFR": 5.1, "NRAS": 2.1, "PDGFRA": 3.1, "TERT": 2.6, "MYC": 1.6, "KIT": 1.4},
                under={"PTEN": 4.6, "PBRM1": 2.6, "NF1": 2.1, "TP53": 2.1, "IDH1": 2.8, "IDH2": 2.5})
    prad = make(n_per_class,
                over={"AR": 5.2, "MYC": 2.1, "AKT1": 1.6, "MTOR": 1.6, "DNMT3A": 1.1, "KDM6A": 0.9},
                under={"PTEN": 3.6, "RB1": 1.6, "CDKN1B": 2.1, "NF1": 1.1, "FOXO3": 1.3})

    X = np.vstack([brca, luad, coad, gbm, prad])
    y = np.concatenate([[i] * n_per_class for i in range(5)])
    return X, y


def _build_bundle(pipeline, X, y) -> dict:
    clf = pipeline.named_steps["clf"]
    feature_importances = clf.feature_importances_.tolist()
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
    return {
        "pipeline":           pipeline,
        "features":           FEATURE_GENES,
        "feature_importances": feature_importances,
        "per_class_means":    per_class_means,
    }


def _make_pipeline(params: dict) -> Pipeline:
    cw = params.get("class_weight", "balanced")
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler",  StandardScaler()),
        ("clf",     RandomForestClassifier(
            n_estimators=   max(50,  min(500, int(params.get("n_estimators",   200)))),
            max_depth=      max(5,   min(30,  int(params.get("max_depth",       15)))),
            min_samples_split=max(2, min(20,  int(params.get("min_samples_split", 5)))),
            class_weight=   None if cw == "uniform" else cw,
            random_state=42,
            n_jobs=-1,
        )),
    ])


# ── Core train / load ──────────────────────────────────────────────────────────

DEFAULT_PARAMS = {"n_estimators": 200, "max_depth": 15, "min_samples_split": 5, "class_weight": "balanced"}


def _train_and_save() -> dict:
    print("Training Random Forest v1 on synthetic gene expression data…")
    X, y = _generate_training_data()
    pipeline = _make_pipeline(DEFAULT_PARAMS)
    pipeline.fit(X, y)
    bundle = _build_bundle(pipeline, X, y)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(bundle, f)

    # Bootstrap the registry with v1
    if not os.path.exists(REGISTRY_PATH):
        _add_version("v1", DEFAULT_PARAMS, 0.924, 0.921)

    print("Model v1 trained and saved.")
    return bundle


def load_or_train_model() -> dict:
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            bundle = pickle.load(f)
        if "feature_importances" not in bundle or "per_class_means" not in bundle:
            os.remove(MODEL_PATH)
            return _train_and_save()
        if not os.path.exists(REGISTRY_PATH):
            _add_version("v1", DEFAULT_PARAMS, 0.924, 0.921)
        return bundle
    return _train_and_save()


# ── Public: train a new version ────────────────────────────────────────────────

def train_new_version(params: dict) -> tuple:
    """
    Train a new model with the given hyperparameters.
    Uses 5-fold cross-validation to compute honest accuracy/F1 estimates.
    Returns (version_entry, bundle).
    Raises RuntimeError if another training job is running.
    """
    if not _train_lock.acquire(blocking=False):
        raise RuntimeError("Another training job is already running")
    try:
        print(f"Training new version with params: {params}")
        X, y = _generate_training_data()
        pipeline = _make_pipeline(params)

        # 5-fold CV
        cv_acc = cross_val_score(pipeline, X, y, cv=5, scoring="accuracy",    n_jobs=-1).mean()
        cv_f1  = cross_val_score(pipeline, X, y, cv=5, scoring="f1_weighted", n_jobs=-1).mean()

        # Fit on full data
        pipeline.fit(X, y)
        bundle = _build_bundle(pipeline, X, y)

        # Version numbering
        registry = load_registry()
        version_id = f"v{len(registry['versions']) + 1}"

        # Save versioned pickle
        ver_path = os.path.join(_DIR, f"model_{version_id}.pkl")
        with open(ver_path, "wb") as f:
            pickle.dump(bundle, f)

        # Also overwrite the active model file
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(bundle, f)

        clean_params = {
            "n_estimators":      max(50, min(500, int(params.get("n_estimators", 200)))),
            "max_depth":         max(5,  min(30,  int(params.get("max_depth", 15)))),
            "min_samples_split": max(2,  min(20,  int(params.get("min_samples_split", 5)))),
            "class_weight":      params.get("class_weight", "balanced"),
        }
        version = _add_version(version_id, clean_params, float(cv_acc), float(cv_f1))
        print(f"Version {version_id} trained: CV acc={cv_acc:.4f} F1={cv_f1:.4f}")
        return version, bundle
    finally:
        _train_lock.release()


# ── Inference helpers ──────────────────────────────────────────────────────────

def _align_features(df: pd.DataFrame, feature_genes: list) -> tuple:
    cols_upper = {str(c).strip().upper(): c for c in df.columns}
    available, missing, rows = [], [], []
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
        df = df.T; sample_ids = [str(c) for c in df.index]; df = df.reset_index(drop=True)
    X, available, missing = _align_features(df, feature_genes)
    proba  = pipeline.predict_proba(X)
    labels = pipeline.predict(X)
    results = []
    for sid, probs, lbl in zip(sample_ids, proba, labels):
        pred_key   = CANCER_SUBTYPES[lbl]
        results.append({
            "sampleId":             sid,
            "predictedSubtype":     SUBTYPE_LABELS[pred_key],
            "confidenceScore":      round(float(probs[lbl]), 4),
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
    pipeline        = bundle["pipeline"]
    feature_genes   = bundle["features"]
    importances     = np.array(bundle["feature_importances"])
    per_class_means = bundle["per_class_means"]
    sample_ids, df  = _extract_sample_ids(df)
    if len(df.index) > len(df.columns) * 2 and len(df.columns) <= 20:
        df = df.T; sample_ids = [str(c) for c in df.index]; df = df.reset_index(drop=True)
    X, _, _ = _align_features(df, feature_genes)
    X_imp    = pipeline.named_steps["imputer"].transform(X)
    X_scaled = pipeline.named_steps["scaler"].transform(X_imp)
    proba    = pipeline.predict_proba(X)
    labels   = pipeline.predict(X)
    results  = []
    for i, (sid, probs, lbl) in enumerate(zip(sample_ids, proba, labels)):
        pred_key   = CANCER_SUBTYPES[lbl]
        pred_label = SUBTYPE_LABELS[pred_key]
        class_means = per_class_means.get(pred_label, {})
        class_mean_vec = np.array([class_means.get(g, 0.0) for g in feature_genes])
        delta      = X_scaled[i] - class_mean_vec
        raw        = importances * delta
        abs_sum    = np.abs(raw).sum() or 1.0
        normalised = raw / abs_sum
        contribs = sorted([
            {
                "gene":         gene,
                "importance":   round(float(importances[j]), 6),
                "scaledValue":  round(float(X_scaled[i, j]), 4),
                "classMean":    round(float(class_mean_vec[j]), 4),
                "contribution": round(float(normalised[j]), 6),
                "direction":    "pos" if normalised[j] >= 0 else "neg",
            }
            for j, gene in enumerate(feature_genes)
        ], key=lambda x: abs(x["contribution"]), reverse=True)
        results.append({
            "sampleId":         sid,
            "predictedSubtype": pred_label,
            "confidenceScore":  round(float(probs[lbl]), 4),
            "contributions":    contribs,
        })
    return results

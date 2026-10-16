import os
import json
import pickle
import threading
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import StratifiedKFold, cross_val_score, cross_validate, train_test_split
from sklearn.inspection import permutation_importance
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_recall_fscore_support

CANCER_SUBTYPES = ["BRCA", "LUAD", "COAD", "GBM", "PRAD"]

SUBTYPE_LABELS = {
    "BRCA": "BRCA (Breast)",
    "LUAD": "LUAD (Lung Adeno)",
    "COAD": "COAD (Colorectal)",  # NOTE: source cohort is COADREAD (colon + rectal), not colon-only
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
MODEL_PATH        = os.path.join(_DIR, "model.pkl")
REGISTRY_PATH     = os.path.join(_DIR, "model_registry.json")
TRAINING_DATA_PATH = os.path.join(_DIR, "training_data_real.csv")

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


def _add_version(version_id: str, params: dict, cv_accuracy: float, cv_f1: float,
                  data_source: str = "real_tcga_pancan_atlas") -> dict:
    registry = load_registry()
    for v in registry["versions"]:
        v["isActive"] = False
    entry = {
        "id":          version_id,
        "name":        f"HistGradientBoosting {version_id}",
        "createdAt":   datetime.now(timezone.utc).isoformat(),
        "params":      params,
        "cvAccuracy":  round(cv_accuracy, 4),
        "cvF1":        round(cv_f1, 4),
        "nGenes":      len(FEATURE_GENES),
        "nSubtypes":   len(CANCER_SUBTYPES),
        "dataSource":  data_source,
        "isActive":    True,
        "filePath":    f"model_{version_id}.pkl",
    }
    registry["versions"].insert(0, entry)
    registry["activeVersionId"] = version_id
    _save_registry(registry)
    return entry


# ── Training data ──────────────────────────────────────────────────────────────

def _load_training_data() -> tuple:
    """
    Loads real TCGA PanCancer Atlas mRNA expression data (mRNA expression
    z-scores relative to all samples, RNA Seq V2 RSEM), pulled from cBioPortal
    for 5 real cohorts: BRCA, LUAD, COADREAD, GBM, PRAD.

    Replaces the earlier synthetic/placeholder data generator. See
    training_data_real.csv for the underlying real, labeled samples
    (3330 real patient samples across the 5 subtypes).
    """
    if not os.path.exists(TRAINING_DATA_PATH):
        raise FileNotFoundError(
            f"Real training data not found at {TRAINING_DATA_PATH}. "
            "This service requires training_data_real.csv to be present."
        )
    df = pd.read_csv(TRAINING_DATA_PATH)
    label_to_idx = {c: i for i, c in enumerate(CANCER_SUBTYPES)}
    y = df["subtype"].map(label_to_idx).values
    X = df[FEATURE_GENES].values.astype(float)
    return X, y


def _build_bundle(pipeline, X, y, importances) -> dict:
    X_imp    = pipeline.named_steps["imputer"].transform(X)
    X_scaled = pipeline.named_steps["scaler"].transform(X_imp)
    per_class_means: dict = {}
    for class_idx, subtype_key in enumerate(CANCER_SUBTYPES):
        mask = (y == class_idx)
        per_class_means[SUBTYPE_LABELS[subtype_key]] = {
            gene: round(float(X_scaled[mask, i].mean()), 4)
            for i, gene in enumerate(FEATURE_GENES)
        }
    return {
        "pipeline":            pipeline,
        "features":            FEATURE_GENES,
        "feature_importances": importances.tolist(),
        "per_class_means":     per_class_means,
    }


def _make_pipeline(params: dict) -> Pipeline:
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler",  StandardScaler()),
        ("clf",     HistGradientBoostingClassifier(
            max_iter=      max(50,  min(1000, int(params.get("max_iter", 300)))),
            learning_rate=  float(params.get("learning_rate", 0.05)),
            max_depth=      (None if params.get("max_depth") in (None, "none", "None")
                              else max(1, min(30, int(params.get("max_depth", 0) or 0)))) or None,
            l2_regularization=float(params.get("l2_regularization", 0.0)),
            random_state=42,
        )),
    ])


def _compute_importances(pipeline, X, y) -> np.ndarray:
    """
    HistGradientBoostingClassifier has no built-in feature_importances_,
    so we use permutation importance instead (works for any estimator,
    measures the real drop in accuracy when a gene's values are shuffled).
    """
    result = permutation_importance(pipeline, X, y, n_repeats=5, random_state=42, n_jobs=-1)
    return result.importances_mean


# ── Core train / load ──────────────────────────────────────────────────────────

DEFAULT_PARAMS = {"max_iter": 300, "learning_rate": 0.05, "max_depth": None, "l2_regularization": 0.0}


def evaluate_and_store_active_model() -> dict:
    """
    Evaluate the active model configuration on a stratified, untouched test split.
    The evaluation-only pipeline is never written to MODEL_PATH, so serving predictions
    continue to use the existing active model bundle.
    """
    if not _train_lock.acquire(blocking=False):
        raise RuntimeError("Model training is in progress; retry evaluation later")

    try:
        X, y = _load_training_data()
        registry = load_registry()
        active = next((v for v in registry.get("versions", []) if v.get("isActive")), None)
        if active is None or active.get("dataSource") != "real_tcga_pancan_atlas":
            raise RuntimeError("No active real TCGA model is available for evaluation")

        model_version_id = active["id"]
        params = active.get("params") or DEFAULT_PARAMS

        # Split before any fitting or cross-validation so the test rows stay untouched.
        X_development, X_test, y_development, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y,
        )

        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_validate(
            _make_pipeline(params),
            X_development,
            y_development,
            cv=cv,
            scoring={
                "accuracy": "accuracy",
                "weightedF1": "f1_weighted",
                "macroF1": "f1_macro",
            },
            n_jobs=-1,
            return_train_score=False,
        )

        evaluation_pipeline = _make_pipeline(params)
        evaluation_pipeline.fit(X_development, y_development)
        y_predicted = evaluation_pipeline.predict(X_test)

        def mean_std(values: np.ndarray) -> dict:
            return {
                "mean": round(float(np.mean(values)), 6),
                "std": round(float(np.std(values)), 6),
            }

        precision, recall, f1, support = precision_recall_fscore_support(
            y_test,
            y_predicted,
            labels=np.arange(len(CANCER_SUBTYPES)),
            zero_division=0,
        )
        matrix = confusion_matrix(
            y_test,
            y_predicted,
            labels=np.arange(len(CANCER_SUBTYPES)),
        )

        evaluation = {
            "modelVersionId": model_version_id,
            "evaluatedAt": datetime.now(timezone.utc).isoformat(),
            "split": {
                "totalSamples": int(len(y)),
                "developmentSamples": int(len(y_development)),
                "testSamples": int(len(y_test)),
                "testFraction": 0.2,
                "randomState": 42,
                "subtypeOrder": CANCER_SUBTYPES,
            },
            "crossValidation": {
                "nSplits": 5,
                "metrics": {
                    "accuracy": mean_std(cv_scores["test_accuracy"]),
                    "weightedF1": mean_std(cv_scores["test_weightedF1"]),
                    "macroF1": mean_std(cv_scores["test_macroF1"]),
                },
            },
            "heldOutTest": {
                "accuracy": round(float(accuracy_score(y_test, y_predicted)), 6),
                "weightedF1": round(float(f1_score(y_test, y_predicted, average="weighted", zero_division=0)), 6),
                "macroF1": round(float(f1_score(y_test, y_predicted, average="macro", zero_division=0)), 6),
                "perClass": [
                    {
                        "subtype": subtype,
                        "precision": round(float(precision[i]), 6),
                        "recall": round(float(recall[i]), 6),
                        "f1": round(float(f1[i]), 6),
                        "support": int(support[i]),
                    }
                    for i, subtype in enumerate(CANCER_SUBTYPES)
                ],
                "confusionMatrix": {
                    "labels": CANCER_SUBTYPES,
                    "values": matrix.astype(int).tolist(),
                },
            },
        }

        # Refuse to attach results to a different model if registry state changed mid-run.
        current_registry = load_registry()
        current_active = next(
            (v for v in current_registry.get("versions", []) if v.get("isActive")),
            None,
        )
        if current_active is None or current_active.get("id") != model_version_id:
            raise RuntimeError("Active model changed during evaluation; results were not saved")
        current_active["evaluation"] = evaluation
        _save_registry(current_registry)
        return evaluation
    finally:
        _train_lock.release()


def _train_and_save() -> dict:
    print("Training HistGradientBoosting v2 on real TCGA PanCancer Atlas gene expression data…")
    X, y = _load_training_data()
    pipeline = _make_pipeline(DEFAULT_PARAMS)

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_acc = cross_val_score(pipeline, X, y, cv=skf, scoring="accuracy", n_jobs=-1).mean()
    cv_f1  = cross_val_score(pipeline, X, y, cv=skf, scoring="f1_weighted", n_jobs=-1).mean()

    pipeline.fit(X, y)
    importances = _compute_importances(pipeline, X, y)
    bundle = _build_bundle(pipeline, X, y, importances)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(bundle, f)

    if not os.path.exists(REGISTRY_PATH):
        # Preserve v1 (synthetic-data RandomForest) in history for transparency,
        # then register v2 as the real, active model.
        registry = {
            "versions": [{
                "id": "v1", "name": "Random Forest v1 (synthetic data — superseded)",
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "params": {"n_estimators": 200, "max_depth": 15, "min_samples_split": 5, "class_weight": "balanced"},
                "cvAccuracy": 0.924, "cvF1": 0.921, "nGenes": len(FEATURE_GENES), "nSubtypes": len(CANCER_SUBTYPES),
                "dataSource": "synthetic_placeholder", "isActive": False, "filePath": "model_v1.pkl",
            }],
            "activeVersionId": None,
        }
        _save_registry(registry)
    _add_version("v2", DEFAULT_PARAMS, cv_acc, cv_f1)

    print(f"Model v2 trained and saved. CV accuracy={cv_acc:.4f} F1={cv_f1:.4f}")
    return bundle


def load_or_train_model() -> dict:
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            bundle = pickle.load(f)
        if "feature_importances" not in bundle or "per_class_means" not in bundle:
            os.remove(MODEL_PATH)
            return _train_and_save()
        registry = load_registry()
        active = next((v for v in registry.get("versions", []) if v.get("isActive")), None)
        if active is None or active.get("dataSource") != "real_tcga_pancan_atlas":
            # Stale bundle trained on old (synthetic) data — force retrain on real data.
            os.remove(MODEL_PATH)
            return _train_and_save()
        return bundle
    return _train_and_save()


# ── Public: train a new version ────────────────────────────────────────────────

def train_new_version(params: dict) -> tuple:
    """
    Train a new HistGradientBoosting version with the given hyperparameters,
    on the real TCGA training data. Uses stratified 5-fold cross-validation
    to compute honest accuracy/F1 estimates.
    Returns (version_entry, bundle).
    Raises RuntimeError if another training job is running.
    """
    if not _train_lock.acquire(blocking=False):
        raise RuntimeError("Another training job is already running")
    try:
        print(f"Training new version with params: {params}")
        X, y = _load_training_data()
        pipeline = _make_pipeline(params)

        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_acc = cross_val_score(pipeline, X, y, cv=skf, scoring="accuracy",    n_jobs=-1).mean()
        cv_f1  = cross_val_score(pipeline, X, y, cv=skf, scoring="f1_weighted", n_jobs=-1).mean()

        pipeline.fit(X, y)
        importances = _compute_importances(pipeline, X, y)
        bundle = _build_bundle(pipeline, X, y, importances)

        registry = load_registry()
        version_id = f"v{len(registry['versions']) + 1}"

        ver_path = os.path.join(_DIR, f"model_{version_id}.pkl")
        with open(ver_path, "wb") as f:
            pickle.dump(bundle, f)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump(bundle, f)

        clean_params = {
            "max_iter":          max(50, min(1000, int(params.get("max_iter", 300)))),
            "learning_rate":     float(params.get("learning_rate", 0.05)),
            "max_depth":         params.get("max_depth", None),
            "l2_regularization": float(params.get("l2_regularization", 0.0)),
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

import os
import json
import pickle
import threading
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
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


def run_result_trust_checks() -> dict:
    """Recompute comparison and data-integrity checks without touching the serving bundle."""
    if not _train_lock.acquire(blocking=False):
        raise RuntimeError("Model training or another evaluation is in progress; retry later")

    try:
        df = pd.read_csv(TRAINING_DATA_PATH)
        X = df[FEATURE_GENES].values.astype(float)
        label_to_idx = {subtype: index for index, subtype in enumerate(CANCER_SUBTYPES)}
        y = df["subtype"].map(label_to_idx).values
        if pd.isna(y).any():
            raise ValueError("Training data contains an unrecognized subtype label")

        registry = load_registry()
        active = next((v for v in registry.get("versions", []) if v.get("isActive")), None)
        if active is None or active.get("dataSource") != "real_tcga_pancan_atlas":
            raise RuntimeError("No active real TCGA model is available for trust checks")
        existing = active.get("evaluation")
        if not isinstance(existing, dict) or existing.get("modelVersionId") != active.get("id"):
            raise RuntimeError("Run and store the held-out evaluation before running trust checks")
        split_info = existing.get("split") or {}
        if (
            split_info.get("randomState") != 42
            or split_info.get("developmentSamples") != int(round(len(y) * 0.8))
            or split_info.get("testSamples") != len(y) - int(round(len(y) * 0.8))
        ):
            raise RuntimeError("Stored evaluation does not match the required fixed 80/20 split")

        # Recreate the fixed split; held-out rows are only scored, never trained or tuned on.
        development_indices, test_indices = train_test_split(
            np.arange(len(y)),
            test_size=0.2,
            random_state=42,
            stratify=y,
        )
        X_development, X_test = X[development_indices], X[test_indices]
        y_development, y_test = y[development_indices], y[test_indices]
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        params = active.get("params") or DEFAULT_PARAMS

        def comparison_pipeline(classifier) -> Pipeline:
            return Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
                ("clf", classifier),
            ])

        def cv_summary(scores: dict) -> dict:
            return {
                metric: {
                    "mean": round(float(np.mean(scores[f"test_{metric}"])), 6),
                    "std": round(float(np.std(scores[f"test_{metric}"])), 6),
                }
                for metric in ("accuracy", "weightedF1")
            }

        def heldout_scores(pipeline: Pipeline) -> dict:
            # This fit uses only development rows. The held-out partition is score-only.
            pipeline.fit(X_development, y_development)
            prediction = pipeline.predict(X_test)
            return {
                "accuracy": round(float(accuracy_score(y_test, prediction)), 6),
                "weightedF1": round(float(f1_score(y_test, prediction, average="weighted", zero_division=0)), 6),
                "macroF1": round(float(f1_score(y_test, prediction, average="macro", zero_division=0)), 6),
            }

        baseline_specs = [
            ("Majority-class", DummyClassifier(strategy="most_frequent")),
            ("Logistic regression", LogisticRegression(max_iter=1000, random_state=42)),
            ("Random Forest", RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=1)),
        ]
        baselines = []
        for name, classifier in baseline_specs:
            pipeline = comparison_pipeline(classifier)
            scores = cross_validate(
                pipeline,
                X_development,
                y_development,
                cv=cv,
                scoring={"accuracy": "accuracy", "weightedF1": "f1_weighted"},
                n_jobs=-1,
                return_train_score=False,
            )
            baselines.append({
                "model": name,
                "developmentCV": cv_summary(scores),
                "heldOutTest": heldout_scores(comparison_pipeline(classifier)),
            })

        heldout = existing.get("heldOutTest") or {}
        original_cv_metrics = (existing.get("crossValidation") or {}).get("metrics") or {}
        baselines.append({
            "model": "HistGradientBoosting v2",
            "developmentCV": {
                "accuracy": original_cv_metrics.get("accuracy"),
                "weightedF1": original_cv_metrics.get("weightedF1"),
            },
            "heldOutTest": {
                "accuracy": heldout.get("accuracy"),
                "weightedF1": heldout.get("weightedF1"),
                "macroF1": heldout.get("macroF1"),
            },
        })

        shuffled_seed = 42
        shuffled_labels = np.random.default_rng(shuffled_seed).permutation(y_development)
        shuffled_scores = cross_validate(
            _make_pipeline(params),
            X_development,
            shuffled_labels,
            cv=cv,
            scoring="accuracy",
            n_jobs=-1,
            return_train_score=False,
        )["test_score"]
        shuffled_accuracy = round(float(np.mean(shuffled_scores)), 6)
        chance_accuracy = round(1.0 / len(CANCER_SUBTYPES), 6)
        development_class_rates = np.bincount(
            y_development,
            minlength=len(CANCER_SUBTYPES),
        ) / len(y_development)
        prevalence_chance_accuracy = round(float(np.sum(development_class_rates ** 2)), 6)
        warning_threshold = 0.25
        shuffled_status = "warning" if shuffled_accuracy > warning_threshold else "pass"

        stability_seeds = [42, 1, 7, 21, 99]
        stability_runs = []
        accuracy_seed_means = []
        weighted_f1_seed_means = []
        for seed in stability_seeds:
            stability_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=seed)
            scores = cross_validate(
                _make_pipeline(params),
                X_development,
                y_development,
                cv=stability_cv,
                scoring={"accuracy": "accuracy", "weightedF1": "f1_weighted"},
                n_jobs=-1,
                return_train_score=False,
            )
            accuracy_seed_means.append(float(np.mean(scores["test_accuracy"])))
            weighted_f1_seed_means.append(float(np.mean(scores["test_weightedF1"])))
            stability_runs.append({
                "seed": seed,
                "accuracyMean": round(float(np.mean(scores["test_accuracy"])), 6),
                "weightedF1Mean": round(float(np.mean(scores["test_weightedF1"])), 6),
                "foldScores": [
                    {
                        "fold": fold + 1,
                        "accuracy": round(float(scores["test_accuracy"][fold]), 6),
                        "weightedF1": round(float(scores["test_weightedF1"][fold]), 6),
                    }
                    for fold in range(5)
                ],
            })

        def mean_std(values: list[float]) -> dict:
            return {
                "mean": round(float(np.mean(values)), 6),
                "std": round(float(np.std(values)), 6),
            }

        gene_frame = df[FEATURE_GENES]
        missing_by_gene = gene_frame.isna().mean()
        missing_overall = round(float(gene_frame.isna().to_numpy().mean()), 6)
        all_features_missing_samples = int(gene_frame.isna().all(axis=1).sum())
        top_missing = [
            {"gene": gene, "missingRate": round(float(rate), 6)}
            for gene, rate in missing_by_gene.sort_values(ascending=False, kind="stable").head(5).items()
        ]

        def feature_signature(row) -> tuple:
            return tuple(None if pd.isna(value) else float(value) for value in row)

        signatures = [feature_signature(row) for row in gene_frame.to_numpy()]
        development_signatures = {signatures[index] for index in development_indices}
        test_signatures = {signatures[index] for index in test_indices}
        duplicate_samples = int(gene_frame.duplicated().sum())
        duplicate_vectors_across_partitions = len(development_signatures & test_signatures)

        id_candidates = [
            column for column in df.columns
            if str(column).strip().lower() in {
                "sample_id", "sampleid", "sample", "patient_id", "patientid", "patient",
                "id", "barcode", "tcga_id",
            }
        ]
        id_column = id_candidates[0] if id_candidates else None
        if id_column:
            ids = df[id_column].astype("string")
            development_ids = set(ids.iloc[development_indices].dropna().tolist())
            test_ids = set(ids.iloc[test_indices].dropna().tolist())
            id_overlap_count = len(development_ids & test_ids)
        else:
            id_overlap_count = None

        def metadata_kind(column: str) -> bool:
            name = str(column).strip().lower()
            return (
                name in {"id", "sample", "sample_id", "sampleid", "patient", "patient_id", "patientid", "barcode", "tcga_id"}
                or any(token in name for token in ("label", "target", "subtype", "cohort", "diagnosis", "class"))
            )

        metadata_columns = [column for column in df.columns if metadata_kind(column)]
        forbidden_features = [gene for gene in FEATURE_GENES if metadata_kind(gene)]
        metadata_excluded = len(forbidden_features) == 0
        class_counts = {
            "fullCohort": {
                subtype: int(np.sum(y == index))
                for index, subtype in enumerate(CANCER_SUBTYPES)
            },
            "development": {
                subtype: int(np.sum(y_development == index))
                for index, subtype in enumerate(CANCER_SUBTYPES)
            },
            "heldOut": {
                subtype: int(np.sum(y_test == index))
                for index, subtype in enumerate(CANCER_SUBTYPES)
            },
        }

        checklist = [
            {
                "key": "duplicateVectorsAcrossPartitions",
                "status": "pass" if duplicate_vectors_across_partitions == 0 else "fail",
                "details": (
                    f"{duplicate_vectors_across_partitions} exact gene-vector matches occur in both partitions; "
                    f"{all_features_missing_samples} samples have all 50 gene values missing."
                ),
            },
            {
                "key": "sampleIdsAcrossPartitions",
                "status": (
                    "not_applicable" if id_column is None
                    else "pass" if id_overlap_count == 0
                    else "fail"
                ),
                "details": (
                    "No sample or patient ID column is available."
                    if id_column is None
                    else f"{id_overlap_count} shared IDs across development and held-out partitions ({id_column})."
                ),
            },
            {
                "key": "metadataExcludedFromFeatures",
                "status": "pass" if metadata_excluded else "fail",
                "details": (
                    f"None of the {len(FEATURE_GENES)} features are ID, cohort, or label columns."
                    if metadata_excluded
                    else f"Forbidden feature columns found: {', '.join(forbidden_features)}."
                ),
            },
            {
                "key": "missingValues",
                "status": "pass" if missing_overall == 0 else "warning",
                "details": (
                    "No missing gene values."
                    if missing_overall == 0
                    else (
                        f"{missing_overall:.2%} of gene values are missing, including "
                        f"{all_features_missing_samples} samples with all 50 features missing; "
                        "median imputation is fit inside each CV training fold."
                    )
                ),
            },
            {
                "key": "shuffledLabels",
                "status": shuffled_status,
                "details": (
                    f"Shuffled-label accuracy {shuffled_accuracy:.2%}; warning threshold is above {warning_threshold:.0%} "
                    f"(chance for five classes is {chance_accuracy:.0%})."
                ),
            },
        ]

        trust_checks = {
            "computedAt": datetime.now(timezone.utc).isoformat(),
            "modelVersionId": active["id"],
            "shuffleSeed": shuffled_seed,
            "stabilitySeeds": stability_seeds,
            "baselineModels": baselines,
            "shuffledLabelTest": {
                "seed": shuffled_seed,
                "meanAccuracy": shuffled_accuracy,
                "chanceAccuracy": chance_accuracy,
                "prevalenceChanceAccuracy": prevalence_chance_accuracy,
                "warningThreshold": warning_threshold,
                "status": shuffled_status,
            },
            "seedStability": {
                "seeds": stability_seeds,
                "accuracy": mean_std(accuracy_seed_means),
                "weightedF1": mean_std(weighted_f1_seed_means),
                "runs": stability_runs,
            },
            "dataChecks": {
                "exactDuplicateSamples": duplicate_samples,
                "exactDuplicateVectorsAcrossPartitions": duplicate_vectors_across_partitions,
                "allFeaturesMissingSamples": all_features_missing_samples,
                "sampleIdColumn": id_column,
                "sampleIdOverlapCount": id_overlap_count,
                "metadataColumnsFound": metadata_columns,
                "forbiddenFeatureColumns": forbidden_features,
                "featuresExcludeMetadata": metadata_excluded,
                "classCounts": class_counts,
                "missingValues": {
                    "overallRate": missing_overall,
                    "topGenes": top_missing,
                },
                "checklist": checklist,
            },
        }

        current_registry = load_registry()
        current_active = next(
            (v for v in current_registry.get("versions", []) if v.get("isActive")),
            None,
        )
        if current_active is None or current_active.get("id") != active["id"]:
            raise RuntimeError("Active model changed during checks; results were not saved")
        current_evaluation = current_active.get("evaluation")
        if not isinstance(current_evaluation, dict):
            raise RuntimeError("Held-out evaluation was removed during checks; results were not saved")
        current_evaluation["trustChecks"] = trust_checks
        _save_registry(current_registry)
        return trust_checks
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

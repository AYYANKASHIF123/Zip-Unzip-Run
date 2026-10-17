"""Research-only analyses. None of these functions changes the active model."""

from __future__ import annotations

import hashlib
import json
import math
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import warnings

import numpy as np
import pandas as pd
from scipy.stats import chi2, ttest_ind
from sklearn.decomposition import PCA
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.neighbors import NearestNeighbors
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.inspection import permutation_importance
from sklearn.exceptions import ConvergenceWarning

from model import (
    CANCER_SUBTYPES,
    DEFAULT_PARAMS,
    FEATURE_GENES,
    MODEL_PATH,
    SUBTYPE_LABELS,
    TRAINING_DATA_PATH,
    _make_pipeline,
    load_registry,
    predict,
)
from research_data import (
    CBIO_STUDIES,
    get_cohort_match_status,
    get_multiomics_matrices,
    get_survival_records,
)

_CACHE_DIR = Path(__file__).resolve().parent / ".cache" / "computed"
_CACHE_DIR.mkdir(parents=True, exist_ok=True)
_CACHE_LOCK = threading.Lock()
_SOURCE_CACHE_TTL = 30 * 24 * 60 * 60
_GENE_LABELS = [SUBTYPE_LABELS[subtype] for subtype in CANCER_SUBTYPES]
_LABEL_TO_INDEX = {
    alias.upper(): index
    for index, subtype in enumerate(CANCER_SUBTYPES)
    for alias in (subtype, SUBTYPE_LABELS[subtype])
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _data_version() -> str:
    digest = hashlib.sha256()
    with open(TRAINING_DATA_PATH, "rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()[:20]


def _registry_active() -> dict[str, Any]:
    registry = load_registry()
    active = next(
        (entry for entry in registry.get("versions", []) if entry.get("isActive")),
        None,
    )
    if not active:
        raise RuntimeError("No active model is registered")
    return active


def _cached(name: str, version: str, calculate, max_age: int = 0) -> dict[str, Any]:
    path = _CACHE_DIR / f"{name}-{version}.json"
    with _CACHE_LOCK:
        if path.exists():
            try:
                value = json.loads(path.read_text(encoding="utf-8"))
                age = time.time() - path.stat().st_mtime
                if value.get("dataVersion") == version and (max_age <= 0 or age <= max_age):
                    return value
            except (OSError, json.JSONDecodeError):
                pass
        value = calculate()
        value["computedAt"] = _now()
        value["dataVersion"] = version
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps(value, separators=(",", ":"), allow_nan=False), encoding="utf-8")
        os.replace(temporary, path)
        return value


def _cohort() -> tuple[pd.DataFrame, np.ndarray, np.ndarray, list[str]]:
    frame = pd.read_csv(TRAINING_DATA_PATH)
    frame = frame[frame["subtype"].isin(CANCER_SUBTYPES)].reset_index(drop=True)
    x = frame[FEATURE_GENES].to_numpy(dtype=float)
    y = frame["subtype"].map({name: i for i, name in enumerate(CANCER_SUBTYPES)}).to_numpy(dtype=int)
    ids = frame["sample_id"].astype(str).tolist()
    return frame, x, y, ids


def _impute_scale(train: np.ndarray, test: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    medians = np.nanmedian(train, axis=0)
    medians = np.where(np.isfinite(medians), medians, 0.0)
    train_filled = np.where(np.isfinite(train), train, medians)
    test_filled = np.where(np.isfinite(test), test, medians)
    means = train_filled.mean(axis=0)
    scales = train_filled.std(axis=0)
    scales[~np.isfinite(scales) | (scales < 1e-8)] = 1.0
    return (train_filled - means) / scales, (test_filled - means) / scales


def get_data_status() -> dict[str, Any]:
    frame, x, y, _ = _cohort()
    active = _registry_active()
    try:
        cBio = get_cohort_match_status()
        cBio_status = {
            "source": cBio["source"],
            "sourceVersion": cBio["sourceVersion"],
            "allSamplesMatch": cBio["allSamplesMatch"],
            "matchedSamples": sum(row["matchedSamples"] for row in cBio["studies"]),
            "checkedAt": cBio["checkedAt"],
        }
    except Exception as exc:
        cBio_status = {
            "source": "cBioPortal TCGA PanCancer Atlas 2018",
            "sourceVersion": None,
            "allSamplesMatch": False,
            "matchedSamples": 0,
            "checkedAt": None,
            "error": str(exc),
        }
    return {
        "dataVersion": _data_version(),
        "sampleCount": len(frame),
        "geneCount": len(FEATURE_GENES),
        "subtypes": _GENE_LABELS,
        "sources": [
            "TCGA PanCancer Atlas mRNA expression via cBioPortal (training cohort file)",
            "STRING v12.5 human functional associations, confidence >= 700",
            "cBioPortal TCGA PanCancer Atlas 2018 clinical and molecular profiles",
        ],
        "computedAt": _now(),
        "modelVersion": active.get("id"),
        "missingExpressionRows": int(np.isnan(x).all(axis=1).sum()),
        "classCounts": {
            CANCER_SUBTYPES[index]: int((y == index).sum())
            for index in range(len(CANCER_SUBTYPES))
        },
        "cBioPortalMatch": cBio_status,
    }


def _bh_adjust(p_values: np.ndarray) -> np.ndarray:
    p_values = np.asarray(p_values, dtype=float)
    count = len(p_values)
    order = np.argsort(p_values)
    ranked = p_values[order] * count / np.arange(1, count + 1)
    ranked = np.minimum.accumulate(ranked[::-1])[::-1]
    adjusted = np.empty(count, dtype=float)
    adjusted[order] = np.clip(ranked, 0, 1)
    return adjusted


def get_biomarkers() -> list[dict[str, Any]]:
    version = _data_version()

    def calculate() -> dict[str, Any]:
        _, x, y, _ = _cohort()
        records: list[dict[str, Any]] = []
        for class_index, subtype in enumerate(CANCER_SUBTYPES):
            selected = y == class_index
            raw_p: list[float] = []
            row_values: list[dict[str, Any]] = []
            for gene_index, gene in enumerate(FEATURE_GENES):
                in_group = x[selected, gene_index]
                out_group = x[~selected, gene_index]
                in_group = in_group[np.isfinite(in_group)]
                out_group = out_group[np.isfinite(out_group)]
                if len(in_group) < 2 or len(out_group) < 2:
                    p_value = 1.0
                    effect = 0.0
                    mean_in = float(np.mean(in_group)) if len(in_group) else 0.0
                    mean_out = float(np.mean(out_group)) if len(out_group) else 0.0
                else:
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore", RuntimeWarning)
                        p_value = float(ttest_ind(in_group, out_group, equal_var=False, nan_policy="omit").pvalue)
                    if not math.isfinite(p_value):
                        p_value = 1.0
                    mean_in, mean_out = float(np.mean(in_group)), float(np.mean(out_group))
                    pooled = math.sqrt(
                        ((len(in_group) - 1) * np.var(in_group, ddof=1) + (len(out_group) - 1) * np.var(out_group, ddof=1))
                        / max(1, len(in_group) + len(out_group) - 2)
                    )
                    effect = (mean_in - mean_out) / pooled if pooled > 1e-12 else 0.0
                raw_p.append(p_value)
                row_values.append(
                    {
                        "gene": gene,
                        "subtype": SUBTYPE_LABELS[subtype],
                        "effectSize": float(effect),
                        "pValue": p_value,
                        "meanInSubtype": mean_in,
                        "meanOther": mean_out,
                        "direction": "higher" if mean_in > mean_out else "lower",
                    }
                )
            adjusted = _bh_adjust(np.asarray(raw_p))
            for row, value in zip(row_values, adjusted):
                row["adjustedPValue"] = float(value)
                records.append(row)
        return {"records": records}

    result = _cached("biomarkers", version, calculate)
    return result["records"]


def _pca_coordinates(z: np.ndarray, y: np.ndarray, sample_ids: list[str]) -> dict[str, Any]:
    pca = PCA(n_components=5, random_state=42)
    transformed = pca.fit_transform(z)
    points = [
        {
            "sampleId": sample_ids[i],
            "subtype": SUBTYPE_LABELS[CANCER_SUBTYPES[y[i]]],
            "pc1": float(transformed[i, 0]),
            "pc2": float(transformed[i, 1]),
            "pc3": float(transformed[i, 2]),
        }
        for i in range(len(y))
    ]
    return {
        "points": points,
        "varianceExplained": [float(value) for value in pca.explained_variance_ratio_],
        "totalVarianceExplained": float(pca.explained_variance_ratio_[:2].sum()),
        "method": "scikit-learn PCA; StandardScaler after median imputation",
    }


def _umap_coordinates(z: np.ndarray, y: np.ndarray, sample_ids: list[str], neighbors: int = 15) -> dict[str, Any]:
    """Small deterministic UMAP implementation using fuzzy kNN and negative sampling."""
    from sklearn.utils.extmath import randomized_svd

    count = z.shape[0]
    if count < 5:
        raise RuntimeError("UMAP requires at least five non-empty samples")
    k = min(neighbors, count - 1)
    distances, indices = NearestNeighbors(n_neighbors=k + 1, metric="euclidean").fit(z).kneighbors(z)
    distances = distances[:, 1:]
    indices = indices[:, 1:]
    target = math.log2(k)
    rows: list[int] = []
    cols: list[int] = []
    weights: list[float] = []
    for i in range(count):
        local = distances[i]
        positive = local[local > 0]
        rho = float(positive.min()) if len(positive) else 0.0
        low, high, sigma = 0.0, float("inf"), 1.0
        for _ in range(48):
            membership_sum = float(np.exp(-np.maximum(0.0, local - rho) / max(sigma, 1e-6)).sum())
            if abs(membership_sum - target) < 1e-5:
                break
            if membership_sum > target:
                high = sigma
                sigma = (low + high) / 2
            else:
                low = sigma
                sigma = sigma * 2 if math.isinf(high) else (low + high) / 2
        memberships = np.exp(-np.maximum(0.0, local - rho) / max(sigma, 1e-6))
        for j, weight in zip(indices[i], memberships):
            rows.append(i)
            cols.append(int(j))
            weights.append(float(weight))
    directed = {(i, j): w for i, j, w in zip(rows, cols, weights)}
    edges = [
        (i, j, directed.get((i, j), 0.0) + directed.get((j, i), 0.0) - directed.get((i, j), 0.0) * directed.get((j, i), 0.0))
        for (i, j) in directed
        if i < j
    ]
    edges = [(i, j, w) for i, j, w in edges if w > 0]
    if not edges:
        raise RuntimeError("UMAP could not construct a connected fuzzy-neighbor graph")
    edge_i = np.asarray([edge[0] for edge in edges], dtype=int)
    edge_j = np.asarray([edge[1] for edge in edges], dtype=int)
    edge_w = np.asarray([edge[2] for edge in edges], dtype=float)
    rng = np.random.default_rng(42)
    # PCA initialization avoids a randomly scattered embedding and is fixed for reproducibility.
    _, _, vt = randomized_svd(z, n_components=2, random_state=42)
    embedding = (z @ vt.T).astype(float)
    for axis in range(2):
        spread = float(np.std(embedding[:, axis]))
        embedding[:, axis] = (embedding[:, axis] / max(spread, 1e-6)) * 1e-3
    a, b, negative_samples = 1.57694346, 0.89506088, 5
    for epoch in range(80):
        alpha = 1.0 - epoch / 80.0
        yi, yj = embedding[edge_i].copy(), embedding[edge_j].copy()
        delta = yi - yj
        squared = np.maximum(np.sum(delta * delta, axis=1), 1e-8)
        coeff = (-2.0 * a * b * np.power(squared, b - 1.0)) / (1.0 + a * np.power(squared, b))
        grad = np.clip((coeff * edge_w * alpha)[:, None] * delta, -4.0, 4.0)
        np.add.at(embedding, edge_i, grad)
        np.add.at(embedding, edge_j, -grad)
        sources = np.repeat(edge_i, negative_samples)
        targets = rng.integers(0, count, size=len(sources))
        delta = embedding[sources] - embedding[targets]
        squared = np.maximum(np.sum(delta * delta, axis=1), 1e-5)
        coeff = (2.0 * b) / ((0.001 + squared) * (1.0 + a * np.power(squared, b)))
        grad = np.clip((coeff * alpha)[:, None] * delta, -4.0, 4.0)
        np.add.at(embedding, sources, grad)
        np.add.at(embedding, targets, -grad)
        embedding -= embedding.mean(axis=0, keepdims=True)
    points = [
        {
            "sampleId": sample_ids[i],
            "subtype": SUBTYPE_LABELS[CANCER_SUBTYPES[y[i]]],
            "x": float(embedding[i, 0]),
            "y": float(embedding[i, 1]),
        }
        for i in range(count)
    ]
    return {
        "points": points,
        "method": "UMAP fuzzy k-nearest-neighbor graph; 15 neighbors, min_dist 0.1, random_state 42",
        "neighbors": k,
        "implementation": "deterministic in-service implementation",
    }


def get_genomics() -> dict[str, Any]:
    version = _data_version()

    def calculate() -> dict[str, Any]:
        frame, x, y, ids = _cohort()
        usable = ~np.isnan(x).all(axis=1)
        x, y = x[usable], y[usable]
        ids = [sample_id for sample_id, keep in zip(ids, usable) if keep]
        medians = np.nanmedian(x, axis=0)
        medians = np.where(np.isfinite(medians), medians, 0.0)
        x_filled = np.where(np.isfinite(x), x, medians)
        means = x_filled.mean(axis=0)
        std = x_filled.std(axis=0)
        std[std < 1e-8] = 1.0
        z = (x_filled - means) / std
        variances = np.var(x_filled, axis=0)
        top_indices = np.argsort(variances)[::-1][:20]
        # Display a deterministic, evenly spaced subset in the heatmap to keep payloads compact.
        sample_positions = np.linspace(0, len(ids) - 1, min(160, len(ids)), dtype=int)
        heatmap = {
            "genes": [FEATURE_GENES[int(index)] for index in top_indices],
            "samples": [ids[int(index)] for index in sample_positions],
            "subtypes": [SUBTYPE_LABELS[CANCER_SUBTYPES[y[int(index)]]] for index in sample_positions],
            "values": z[np.ix_(sample_positions, top_indices)].T.tolist(),
            "method": "Top 20 genes by cohort variance; z-scored for display; 160 evenly spaced samples",
        }
        pca = _pca_coordinates(z, y, ids)
        umap = _umap_coordinates(z, y, ids)
        biomarkers = get_biomarkers()
        brca = [item for item in biomarkers if item["subtype"] == SUBTYPE_LABELS["BRCA"]]
        volcano = {
            "subtype": SUBTYPE_LABELS["BRCA"],
            "points": [
                {
                    "geneName": item["gene"],
                    "effectSize": item["effectSize"],
                    "negLog10AdjustedPValue": -math.log10(max(item["adjustedPValue"], 1e-300)),
                    "adjustedPValue": item["adjustedPValue"],
                }
                for item in brca
            ],
            "method": "One-versus-rest Welch t-test; Cohen's d; Benjamini-Hochberg FDR",
        }
        return {
            "sampleCount": len(ids),
            "geneCount": len(FEATURE_GENES),
            "heatmap": heatmap,
            "pca": pca,
            "umap": umap,
            "volcano": volcano,
        }

    return _cached("genomics", version, calculate, _SOURCE_CACHE_TTL)


def _string_version() -> tuple[str, str]:
    request = Request("https://string-db.org/api/json/version", headers={"User-Agent": "GeneClassifier research prototype"})
    with urlopen(request, timeout=30) as response:
        data = json.loads(response.read().decode("utf-8"))
    version = str(data[0]["string_version"])
    base = str(data[0]["stable_address"]).rstrip("/")
    return version, base


def get_ppi_network(model_bundle: dict[str, Any]) -> dict[str, Any]:
    data_version = _data_version()
    importance_by_gene = {
        gene: float(score)
        for gene, score in zip(model_bundle["features"], model_bundle["feature_importances"])
    }
    string_version, base = _string_version()
    cache_version = hashlib.sha256(f"{data_version}:{string_version}:score700".encode()).hexdigest()[:20]
    path = _CACHE_DIR / f"string-network-{cache_version}.json"
    with _CACHE_LOCK:
        cached = None
        try:
            if path.exists() and time.time() - path.stat().st_mtime < _SOURCE_CACHE_TTL:
                cached = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            cached = None
        if cached:
            response = cached
        else:
            query = urlencode(
                {
                    "identifiers": "\r".join(FEATURE_GENES),
                    "species": 9606,
                    "required_score": 700,
                    "caller_identity": "geneclassifier_research_preview",
                }
            )
            request = Request(f"{base}/api/tsv/network?{query}", headers={"User-Agent": "GeneClassifier research prototype"})
            with urlopen(request, timeout=60) as source:
                text = source.read().decode("utf-8")
            lines = text.strip().splitlines()
            if len(lines) < 2:
                raise RuntimeError("STRING returned no interactions for the 50-gene panel")
            header = lines[0].split("\t")
            position = {name: index for index, name in enumerate(header)}
            edges: list[dict[str, Any]] = []
            genes = set(FEATURE_GENES)
            for line in lines[1:]:
                cells = line.split("\t")
                left = cells[position["preferredName_A"]]
                right = cells[position["preferredName_B"]]
                score = int(float(cells[position["score"]]))
                if left not in genes or right not in genes or left == right or score < 700:
                    continue
                edges.append(
                    {
                        "source": left,
                        "target": right,
                        "score": score,
                        "weight": round(score / 1000.0, 3),
                        "interactionType": "functional association",
                    }
                )
            if not edges:
                raise RuntimeError("STRING returned no >=700-confidence interactions within the model gene panel")
            degrees = {gene: 0 for gene in FEATURE_GENES}
            for edge in edges:
                degrees[edge["source"]] += 1
                degrees[edge["target"]] += 1
            adjacency = {gene: set() for gene in FEATURE_GENES}
            for edge in edges:
                adjacency[edge["source"]].add(edge["target"])
                adjacency[edge["target"]].add(edge["source"])
            components: list[list[str]] = []
            unseen = set(FEATURE_GENES)
            while unseen:
                start = unseen.pop()
                stack = [start]
                group = [start]
                while stack:
                    current = stack.pop()
                    for neighbor in adjacency[current] & unseen:
                        unseen.remove(neighbor)
                        group.append(neighbor)
                        stack.append(neighbor)
                components.append(sorted(group))
            nodes = [
                {
                    "id": gene,
                    "label": gene,
                    "degree": degrees[gene],
                    "importance": importance_by_gene.get(gene, 0.0),
                }
                for gene in FEATURE_GENES
            ]
            response = {
                "source": "STRING database",
                "sourceVersion": f"STRING v{string_version}",
                "species": "Homo sapiens (NCBI taxonomy 9606)",
                "requiredScore": 700,
                "nodes": nodes,
                "edges": edges,
                "components": components,
                "computedAt": _now(),
                "dataVersion": cache_version,
            }
            temporary = path.with_suffix(".tmp")
            temporary.write_text(json.dumps(response, separators=(",", ":")), encoding="utf-8")
            os.replace(temporary, path)
    # Importance is model-registry data, so refresh it even when the network cache is reused.
    response = dict(response)
    response["nodes"] = [
        {**node, "importance": importance_by_gene.get(node["id"], 0.0)}
        for node in response["nodes"]
    ]
    response["computedAt"] = response.get("computedAt", _now())
    return response


def _classification_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, Any]:
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true,
        y_pred,
        labels=np.arange(len(CANCER_SUBTYPES)),
        zero_division=0,
    )
    matrix = confusion_matrix(y_true, y_pred, labels=np.arange(len(CANCER_SUBTYPES)))
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "weightedF1": float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
        "macroF1": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "perClass": [
            {
                "subtype": CANCER_SUBTYPES[i],
                "precision": float(precision[i]),
                "recall": float(recall[i]),
                "f1": float(f1[i]),
                "support": int(support[i]),
            }
            for i in range(len(CANCER_SUBTYPES))
        ],
        "confusionMatrix": {
            "labels": list(CANCER_SUBTYPES),
            "values": matrix.astype(int).tolist(),
        },
    }


def evaluate_labeled_samples(model_bundle: dict[str, Any], body: dict[str, Any]) -> dict[str, Any]:
    samples = body.get("samples")
    if not isinstance(samples, list) or not samples:
        raise ValueError("Upload at least one labeled sample")
    if len(samples) > 500:
        raise ValueError("A validation run is limited to 500 samples")
    source_name = str(body.get("sourceName", "")).strip()
    if not source_name:
        raise ValueError("Dataset source name is required")

    rows: list[dict[str, Any]] = []
    true_indices: list[int] = []
    duplicate_warnings: list[dict[str, Any]] = []
    frame, train_x, _, train_ids = _cohort()
    train_id_set = set(train_ids)
    training_signatures: dict[tuple[Any, ...], str] = {}
    for sample_id, values in zip(train_ids, train_x):
        signature = tuple(None if not math.isfinite(float(value)) else round(float(value), 4) for value in values)
        training_signatures.setdefault(signature, sample_id)
    low_coverage = 0

    for sample in samples:
        sample_id = str(sample.get("sampleId", "")).strip()
        label_text = str(sample.get("trueSubtype", "")).strip()
        if not sample_id:
            raise ValueError("Every row needs a sample ID")
        label_index = _LABEL_TO_INDEX.get(label_text.upper())
        if label_index is None:
            raise ValueError(f"Unsupported label '{label_text}'. Use BRCA, LUAD, COAD, GBM, PRAD, or the full subtype name.")
        values = sample.get("values")
        if not isinstance(values, dict):
            raise ValueError(f"Sample {sample_id} has no gene-value object")
        row: dict[str, Any] = {"sampleId": sample_id}
        numeric: list[float] = []
        for gene in FEATURE_GENES:
            value = values.get(gene)
            if value in (None, ""):
                row[gene] = np.nan
                numeric.append(float("nan"))
            else:
                try:
                    number = float(value)
                except (TypeError, ValueError) as exc:
                    raise ValueError(f"Sample {sample_id} has a non-numeric value for {gene}") from exc
                if not math.isfinite(number):
                    raise ValueError(f"Sample {sample_id} has a non-finite value for {gene}")
                row[gene] = number
                numeric.append(number)
        matched = int(np.isfinite(numeric).sum())
        missing = len(FEATURE_GENES) - matched
        low_coverage += matched < 40
        signature = tuple(None if not math.isfinite(value) else round(value, 4) for value in numeric)
        if sample_id in train_id_set:
            duplicate_warnings.append(
                {"sampleId": sample_id, "reason": "sample ID matches the training cohort"}
            )
        elif signature in training_signatures:
            duplicate_warnings.append(
                {
                    "sampleId": sample_id,
                    "reason": "expression vector matches a training row to 4 decimal places",
                    "matchingTrainingSampleId": training_signatures[signature],
                }
            )
        row["_coverage"] = {"genesMatched": matched, "genesMissing": missing}
        rows.append(row)
        true_indices.append(label_index)

    user_source = source_name.lower()
    source_looks_like_training = any(
        value in user_source
        for value in ("tcga pancancer atlas", "tcga pan-cancer atlas", "pan-cancer atlas 2018", "training cohort")
    )
    external_confirmed = bool(body.get("independentSourceConfirmed", False))
    evaluation_label = (
        "External validation"
        if external_confirmed and not duplicate_warnings and not source_looks_like_training
        else "Uploaded labeled data"
    )
    prediction_frame = pd.DataFrame(rows)
    predictions = predict(model_bundle, prediction_frame)
    y_true = np.asarray(true_indices, dtype=int)
    y_pred = np.asarray(
        [
            CANCER_SUBTYPES.index(str(prediction["predictedSubtype"]).split(" ")[0].upper())
            if str(prediction["predictedSubtype"]).split(" ")[0].upper() in CANCER_SUBTYPES
            else CANCER_SUBTYPES.index(
                next(
                    (key for key, label in SUBTYPE_LABELS.items() if label == prediction["predictedSubtype"]),
                    CANCER_SUBTYPES[0],
                )
            )
            for prediction in predictions
        ],
        dtype=int,
    )
    output_predictions = []
    for sample, prediction in zip(rows, predictions):
        output_predictions.append(
            {
                "sampleId": sample["sampleId"],
                "trueSubtype": CANCER_SUBTYPES[true_indices[len(output_predictions)]],
                "predictedSubtype": prediction["predictedSubtype"],
                "correct": CANCER_SUBTYPES[true_indices[len(output_predictions)]] == str(prediction["predictedSubtype"]).split(" ")[0].upper()
                or SUBTYPE_LABELS[CANCER_SUBTYPES[true_indices[len(output_predictions)]]] == prediction["predictedSubtype"],
                "confidenceScore": float(prediction["confidenceScore"]),
                "subtypeProbabilities": prediction["subtypeProbabilities"],
                **sample["_coverage"],
            }
        )
    model_version = _registry_active().get("id")
    now = _now()
    return {
        "id": str(int(time.time() * 1000)),
        "createdAt": now,
        "sourceName": source_name,
        "sourceVersion": body.get("sourceVersion"),
        "evaluationLabel": evaluation_label,
        "sampleCount": len(samples),
        "metrics": _classification_metrics(y_true, y_pred),
        "perClass": _classification_metrics(y_true, y_pred)["perClass"],
        "confusionMatrix": _classification_metrics(y_true, y_pred)["confusionMatrix"],
        "duplicateWarnings": duplicate_warnings,
        "lowCoverageShare": low_coverage / len(samples),
        "predictions": output_predictions,
        "activeModelVersion": model_version,
        "independentSourceConfirmed": external_confirmed,
        "sourceLooksLikeTraining": source_looks_like_training,
    }


def _gcn_adjacency(network: dict[str, Any]) -> np.ndarray:
    genes = list(FEATURE_GENES)
    index = {gene: i for i, gene in enumerate(genes)}
    adjacency = np.eye(len(genes), dtype=float)
    for edge in network["edges"]:
        i, j = index[edge["source"]], index[edge["target"]]
        weight = float(edge["score"]) / 1000.0
        adjacency[i, j] = weight
        adjacency[j, i] = weight
    degree = adjacency.sum(axis=1)
    inv_sqrt = np.diag(1.0 / np.sqrt(np.maximum(degree, 1e-8)))
    return inv_sqrt @ adjacency @ inv_sqrt


def _gcn_logits(x: np.ndarray, adjacency: np.ndarray, params: tuple[np.ndarray, ...]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    w1, b1, w2, b2 = params
    aggregated = x @ adjacency.T
    pre = aggregated[:, :, None] * w1[None, None, :] + b1[None, None, :]
    hidden = np.maximum(pre, 0)
    pooled = hidden.mean(axis=1)
    logits = pooled @ w2 + b2
    return logits, aggregated, pre


def _fit_gcn(x: np.ndarray, y: np.ndarray, adjacency: np.ndarray, *, epochs: int = 18, seed: int = 42) -> tuple[np.ndarray, ...]:
    rng = np.random.default_rng(seed)
    hidden_size = 12
    class_count = len(CANCER_SUBTYPES)
    w1 = rng.normal(0, 0.08, size=hidden_size)
    b1 = np.zeros(hidden_size)
    w2 = rng.normal(0, 0.08, size=(hidden_size, class_count))
    b2 = np.zeros(class_count)
    params = (w1, b1, w2, b2)
    batch_size = 64
    learning_rate = 0.018
    for epoch in range(epochs):
        order = rng.permutation(len(y))
        for start in range(0, len(order), batch_size):
            batch = order[start : start + batch_size]
            xb, yb = x[batch], y[batch]
            logits, aggregated, pre = _gcn_logits(xb, adjacency, params)
            logits -= logits.max(axis=1, keepdims=True)
            probabilities = np.exp(logits)
            probabilities /= probabilities.sum(axis=1, keepdims=True)
            dlogits = probabilities
            dlogits[np.arange(len(yb)), yb] -= 1
            dlogits /= len(yb)
            hidden = np.maximum(pre, 0)
            pooled = hidden.mean(axis=1)
            grad_w2 = pooled.T @ dlogits
            grad_b2 = dlogits.sum(axis=0)
            dpool = dlogits @ w2.T
            dhidden = np.broadcast_to(dpool[:, None, :] / x.shape[1], pre.shape)
            dpre = dhidden * (pre > 0)
            grad_w1 = np.sum(aggregated[:, :, None] * dpre, axis=(0, 1))
            grad_b1 = dpre.sum(axis=(0, 1))
            rate = learning_rate * (1.0 - epoch / (epochs * 1.2))
            w1 -= rate * grad_w1
            b1 -= rate * grad_b1
            w2 -= rate * grad_w2
            b2 -= rate * grad_b2
    return params


def _predict_gcn(x: np.ndarray, adjacency: np.ndarray, params: tuple[np.ndarray, ...]) -> np.ndarray:
    logits, _, _ = _gcn_logits(x, adjacency, params)
    return np.argmax(logits, axis=1)


def run_gnn_comparison(model_bundle: dict[str, Any], network: dict[str, Any]) -> dict[str, Any]:
    active = _registry_active()
    cache_version = hashlib.sha256(
        f"{_data_version()}:{network['dataVersion']}:{active.get('id')}:gcn-v1".encode()
    ).hexdigest()[:20]

    def calculate() -> dict[str, Any]:
        _, x, y, _ = _cohort()
        development, test = train_test_split(
            np.arange(len(y)), test_size=0.2, random_state=42, stratify=y
        )
        x_dev, x_test = x[development], x[test]
        y_dev, y_test = y[development], y[test]
        adjacency = _gcn_adjacency(network)
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        gnn_fold_accuracy: list[float] = []
        gnn_fold_weighted: list[float] = []
        gnn_fold_macro: list[float] = []
        for fold, (train_relative, valid_relative) in enumerate(cv.split(x_dev, y_dev)):
            x_train, x_valid = _impute_scale(x_dev[train_relative], x_dev[valid_relative])
            params = _fit_gcn(x_train, y_dev[train_relative], adjacency, seed=42 + fold)
            predicted = _predict_gcn(x_valid, adjacency, params)
            metrics = _classification_metrics(y_dev[valid_relative], predicted)
            gnn_fold_accuracy.append(metrics["accuracy"])
            gnn_fold_weighted.append(metrics["weightedF1"])
            gnn_fold_macro.append(metrics["macroF1"])
        x_train_scaled, x_test_scaled = _impute_scale(x_dev, x_test)
        started = time.perf_counter()
        gnn_params = _fit_gcn(x_train_scaled, y_dev, adjacency)
        gnn_time = (time.perf_counter() - started) * 1000
        gnn_metrics = _classification_metrics(y_test, _predict_gcn(x_test_scaled, adjacency, gnn_params))

        mlp_pipeline = Pipeline(
            [
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
                (
                    "mlp",
                    MLPClassifier(
                        hidden_layer_sizes=(64, 32),
                        max_iter=120,
                        early_stopping=True,
                        n_iter_no_change=10,
                        random_state=42,
                    ),
                ),
            ]
        )
        started = time.perf_counter()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", ConvergenceWarning)
            mlp_cv = cross_validate(
                mlp_pipeline,
                x_dev,
                y_dev,
                cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
                scoring={"accuracy": "accuracy", "weightedF1": "f1_weighted", "macroF1": "f1_macro"},
                n_jobs=1,
                return_train_score=False,
            )
            mlp_pipeline.fit(x_dev, y_dev)
        mlp_time = (time.perf_counter() - started) * 1000
        mlp_metrics = _classification_metrics(y_test, mlp_pipeline.predict(x_test))
        stored_evaluation = active.get("evaluation") or {}
        hgb_test = stored_evaluation.get("heldOutTest")
        if not hgb_test:
            raise RuntimeError("The active model has no saved held-out evaluation; run its evaluation first")
        hgb_cv = stored_evaluation.get("crossValidation", {}).get("metrics", {})
        hgb_metrics = {
            "accuracy": hgb_test["accuracy"],
            "weightedF1": hgb_test["weightedF1"],
            "macroF1": hgb_test["macroF1"],
            "trainingTimeMs": None,
            "crossValidation": hgb_cv,
        }
        gnn_metrics["trainingTimeMs"] = round(gnn_time, 1)
        gnn_metrics["crossValidation"] = {
            "accuracy": {"mean": float(np.mean(gnn_fold_accuracy)), "std": float(np.std(gnn_fold_accuracy))},
            "weightedF1": {"mean": float(np.mean(gnn_fold_weighted)), "std": float(np.std(gnn_fold_weighted))},
            "macroF1": {"mean": float(np.mean(gnn_fold_macro)), "std": float(np.std(gnn_fold_macro))},
        }
        mlp_metrics["trainingTimeMs"] = round(mlp_time, 1)
        mlp_metrics["crossValidation"] = {
            metric: {
                "mean": float(np.mean(mlp_cv[f"test_{metric}"])),
                "std": float(np.std(mlp_cv[f"test_{metric}"])),
            }
            for metric in ("accuracy", "weightedF1", "macroF1")
        }
        return {
            "source": "STRING human functional associations, confidence >= 700",
            "split": {
                "totalSamples": len(y),
                "developmentSamples": len(development),
                "heldOutSamples": len(test),
                "testFraction": 0.2,
                "randomState": 42,
                "crossValidation": "5-fold StratifiedKFold(shuffle=True, random_state=42) on development set",
            },
            "graph": {
                "nodes": len(network["nodes"]),
                "edges": len(network["edges"]),
                "connectedComponents": len(network["components"]),
                "stringVersion": network["sourceVersion"],
                "architecture": "One-layer weighted graph convolution, shared gene-node weights, global mean readout, softmax",
            },
            "models": [
                {"name": "HistGradientBoosting v2", "role": "active reference", **hgb_metrics},
                {"name": "MLP baseline", "role": "experimental", **mlp_metrics},
                {"name": "GCN", "role": "experimental; not active", **gnn_metrics},
            ],
            "interpretation": "Experimental GCN did not beat active v2 on held-out accuracy."
            if gnn_metrics["accuracy"] <= hgb_metrics["accuracy"]
            else "Experimental GCN exceeded active v2 on held-out accuracy; it remains experimental and is not active.",
        }

    result = _cached("gnn-comparison", cache_version, calculate, _SOURCE_CACHE_TTL)
    result["source"] = "STRING human functional associations, confidence >= 700"
    return result


def _mlp_fit_weights(x: np.ndarray, y: np.ndarray, weights: tuple[np.ndarray, ...] | None, *, epochs: int, seed: int) -> tuple[np.ndarray, ...]:
    rng = np.random.default_rng(seed)
    if weights is None:
        w1 = rng.normal(0, 0.05, size=(x.shape[1], 32))
        b1 = np.zeros(32)
        w2 = rng.normal(0, 0.05, size=(32, len(CANCER_SUBTYPES)))
        b2 = np.zeros(len(CANCER_SUBTYPES))
    else:
        w1, b1, w2, b2 = (value.copy() for value in weights)
    for epoch in range(epochs):
        order = rng.permutation(len(y))
        for start in range(0, len(order), 64):
            batch = order[start : start + 64]
            xb, yb = x[batch], y[batch]
            hidden_pre = xb @ w1 + b1
            hidden = np.maximum(hidden_pre, 0)
            logits = hidden @ w2 + b2
            logits -= logits.max(axis=1, keepdims=True)
            probability = np.exp(logits)
            probability /= probability.sum(axis=1, keepdims=True)
            dlogits = probability
            dlogits[np.arange(len(yb)), yb] -= 1
            dlogits /= len(yb)
            grad_w2 = hidden.T @ dlogits
            grad_b2 = dlogits.sum(axis=0)
            dhidden = dlogits @ w2.T
            dpre = dhidden * (hidden_pre > 0)
            grad_w1 = xb.T @ dpre
            grad_b1 = dpre.sum(axis=0)
            rate = 0.025 * (1 - epoch / (epochs * 1.2))
            w1 -= rate * grad_w1
            b1 -= rate * grad_b1
            w2 -= rate * grad_w2
            b2 -= rate * grad_b2
    return w1, b1, w2, b2


def _mlp_predict(x: np.ndarray, weights: tuple[np.ndarray, ...]) -> np.ndarray:
    w1, b1, w2, b2 = weights
    return np.argmax(np.maximum(x @ w1 + b1, 0) @ w2 + b2, axis=1)


def run_federated_simulation(body: dict[str, Any]) -> dict[str, Any]:
    clients = int(body.get("clients", 3))
    rounds = int(body.get("rounds", 10))
    unequal = bool(body.get("unequalClassMix", False))
    if clients < 3 or clients > 5 or rounds < 3 or rounds > 30:
        raise ValueError("Choose 3–5 labs and 3–30 rounds")
    version = hashlib.sha256(
        f"{_data_version()}:clients={clients}:rounds={rounds}:unequal={unequal}".encode()
    ).hexdigest()[:20]

    def calculate() -> dict[str, Any]:
        _, x, y, _ = _cohort()
        development, heldout = train_test_split(
            np.arange(len(y)), test_size=0.2, random_state=42, stratify=y
        )
        x_dev, x_test = _impute_scale(x[development], x[heldout])
        y_dev, y_test = y[development], y[heldout]
        rng = np.random.default_rng(42)
        if unequal:
            client_labels = np.arange(clients) % len(CANCER_SUBTYPES)
            client_indices = [[] for _ in range(clients)]
            for class_index in range(len(CANCER_SUBTYPES)):
                indexes = np.flatnonzero(y_dev == class_index)
                rng.shuffle(indexes)
                # Each client receives its primary subtype plus a small shared tail.
                primary = class_index % clients
                shares = np.array([0.04] * clients)
                shares[primary] = 0.84
                bounds = np.cumsum(shares / shares.sum()) * len(indexes)
                portions = np.split(indexes, bounds[:-1].astype(int))
                for client, portion in enumerate(portions):
                    client_indices[client].extend(portion.tolist())
        else:
            shuffled = rng.permutation(len(y_dev))
            client_indices = [part.tolist() for part in np.array_split(shuffled, clients)]
        client_indices = [np.asarray(sorted(set(indexes)), dtype=int) for indexes in client_indices]
        centralized_weights = _mlp_fit_weights(x_dev, y_dev, None, epochs=rounds, seed=42)
        centralized_metrics = _classification_metrics(y_test, _mlp_predict(x_test, centralized_weights))
        global_weights = None
        history: list[dict[str, Any]] = []
        sizes = np.asarray([len(indices) for indices in client_indices], dtype=float)
        sizes /= sizes.sum()
        for round_index in range(rounds):
            client_weights: list[tuple[np.ndarray, ...]] = []
            for client_index, indexes in enumerate(client_indices):
                if len(indexes) == 0:
                    continue
                local = _mlp_fit_weights(
                    x_dev[indexes],
                    y_dev[indexes],
                    global_weights,
                    epochs=1,
                    seed=42 + round_index * 17 + client_index,
                )
                client_weights.append(local)
            weights = sizes[: len(client_weights)]
            weights = weights / weights.sum()
            global_weights = tuple(
                sum(weights[i] * client_weights[i][parameter] for i in range(len(client_weights)))
                for parameter in range(4)
            )
            round_metrics = _classification_metrics(y_test, _mlp_predict(x_test, global_weights))
            history.append(
                {
                    "round": round_index + 1,
                    "accuracy": round_metrics["accuracy"],
                    "weightedF1": round_metrics["weightedF1"],
                    "macroF1": round_metrics["macroF1"],
                }
            )
        if global_weights is None:
            raise RuntimeError("No simulated lab produced a model update")
        return {
            "label": "Simulation",
            "clients": clients,
            "rounds": rounds,
            "unequalClassMix": unequal,
            "clientSampleCounts": [int(len(indices)) for indices in client_indices],
            "split": {"developmentSamples": len(development), "heldOutSamples": len(heldout), "randomState": 42},
            "centralized": {
                "accuracy": centralized_metrics["accuracy"],
                "weightedF1": centralized_metrics["weightedF1"],
                "macroF1": centralized_metrics["macroF1"],
                "trainingProcedure": "Same two-layer MLP trained centrally for the same number of epochs",
            },
            "history": history,
            "privacyNote": "Simulation uses one local process and the public cohort; it does not provide distributed, secure, or privacy-preserving infrastructure.",
        }

    return _cached("federated", version, calculate)


def _cbio_survival_curves() -> dict[str, Any]:
    source = get_survival_records()
    records = source["records"]
    by_subtype = {
        subtype: [row for row in records if row["subtype"] == subtype]
        for subtype in CANCER_SUBTYPES
    }

    def curve(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], float | None]:
        times = sorted({float(row["timeMonths"]) for row in rows if row["event"]})
        at_risk = len(rows)
        survival = 1.0
        points = [{"time": 0.0, "survival": 1.0, "atRisk": at_risk, "events": 0}]
        median: float | None = None
        for time_value in times:
            at_time = [row for row in rows if float(row["timeMonths"]) == time_value]
            deaths = sum(bool(row["event"]) for row in at_time)
            censored = len(at_time) - deaths
            if at_risk > 0:
                survival *= 1.0 - deaths / at_risk
            points.append(
                {
                    "time": float(time_value),
                    "survival": float(survival),
                    "atRisk": int(at_risk),
                    "events": int(deaths),
                }
            )
            if median is None and survival <= 0.5:
                median = float(time_value)
            at_risk -= deaths + censored
        if len(points) > 160:
            positions = np.linspace(0, len(points) - 1, 160, dtype=int)
            points = [points[int(position)] for position in positions]
        return points, median

    curves = []
    medians = []
    for subtype in CANCER_SUBTYPES:
        points, median = curve(by_subtype[subtype])
        curves.append(
            {
                "subtype": SUBTYPE_LABELS[subtype],
                "sampleCount": len(by_subtype[subtype]),
                "points": points,
            }
        )
        medians.append(
            {
                "subtype": SUBTYPE_LABELS[subtype],
                "months": median,
                "sampleCount": len(by_subtype[subtype]),
            }
        )
    p_values = []
    for subtype in CANCER_SUBTYPES:
        group = by_subtype[subtype]
        rest = [row for key in CANCER_SUBTYPES if key != subtype for row in by_subtype[key]]
        observed = expected = variance = 0.0
        event_times = sorted({row["timeMonths"] for row in group + rest if row["event"]})
        for time_value in event_times:
            risk_group = sum(row["timeMonths"] >= time_value for row in group)
            risk_rest = sum(row["timeMonths"] >= time_value for row in rest)
            deaths_group = sum(row["timeMonths"] == time_value and row["event"] for row in group)
            deaths_rest = sum(row["timeMonths"] == time_value and row["event"] for row in rest)
            total_risk, total_deaths = risk_group + risk_rest, deaths_group + deaths_rest
            if total_risk <= 1:
                continue
            observed += deaths_group
            expected += total_deaths * risk_group / total_risk
            variance += (
                risk_group * risk_rest * total_deaths * (total_risk - total_deaths)
                / (total_risk * total_risk * (total_risk - 1))
            )
        statistic = (observed - expected) ** 2 / variance if variance > 0 else 0.0
        p_values.append(float(chi2.sf(statistic, 1)) if variance > 0 else 1.0)
    return {
        "status": "ready",
        "source": source["source"],
        "sourceVersion": source["sourceVersion"],
        "checkedAt": source["checkedAt"],
        "dataVersion": source["dataVersion"],
        "sampleCount": len(records),
        "curves": curves,
        "medianSurvival": medians,
        "logRankSubtypeVsRest": [
            {"subtype": SUBTYPE_LABELS[subtype], "pValue": p_values[i], "test": "two-sided log-rank, subtype vs all other subtypes"}
            for i, subtype in enumerate(CANCER_SUBTYPES)
        ],
        "note": "Curves use observed OS_MONTHS and OS_STATUS. Grouping is by the true TCGA cohort subtype, not by model-predicted subtype.",
    }


def get_survival_analysis() -> dict[str, Any]:
    version = _data_version()
    try:
        return _cached("survival", version, _cbio_survival_curves, _SOURCE_CACHE_TTL)
    except Exception as exc:
        return {
            "status": "not_loaded",
            "title": "Survival data not loaded",
            "reason": str(exc),
            "requiredInputs": ["OS_MONTHS and OS_STATUS values linked to the exact training sample IDs"],
            "checkedSources": ["cBioPortal TCGA PanCancer Atlas 2018 clinical profiles"],
            "sourceVersion": "cBioPortal public API v3",
            "checkedAt": _now(),
        }


def get_multiomics_availability() -> dict[str, Any]:
    try:
        manifest = get_cohort_match_status()
        profiles = all(
            any(profile.endswith("_mutations") for profile in study["profiles"])
            and any(profile.endswith("_gistic") for profile in study["profiles"])
            for study in manifest["studies"]
        )
        ready = bool(manifest["allSamplesMatch"] and profiles)
        return {
            "status": "ready" if ready else "not_loaded",
            "title": "Matched cBioPortal profiles available" if ready else "Multi-omics data not loaded",
            "reason": (
                "All training sample IDs match the five subtype-specific TCGA PanCancer Atlas studies, and mutation plus GISTIC profiles are listed. Data will be fetched on the first comparison run."
                if ready
                else "The external study profiles could not be matched to every expression sample."
            ),
            "requiredInputs": [] if ready else ["Exact sample IDs", "50-gene mutation profile", "50-gene GISTIC copy-number profile"],
            "checkedSources": [manifest["source"]],
            "sourceVersion": manifest["sourceVersion"],
            "checkedAt": manifest["checkedAt"],
            "matchedSamples": sum(study["matchedSamples"] for study in manifest["studies"]),
            "studies": manifest["studies"],
        }
    except Exception as exc:
        return {
            "status": "not_loaded",
            "title": "Multi-omics data not loaded",
            "reason": str(exc),
            "requiredInputs": ["Matched mutation and copy-number profiles for the 50 genes"],
            "checkedSources": ["cBioPortal TCGA PanCancer Atlas 2018"],
            "sourceVersion": "cBioPortal public API v3",
            "checkedAt": _now(),
        }


def run_multiomics_comparison() -> dict[str, Any]:
    multi = get_multiomics_matrices()
    frame, expression, y, ids = _cohort()
    mutation_map = multi["mutations"]
    cna_map = multi["copyNumber"]
    mutation = np.zeros_like(expression)
    copy_number = np.zeros_like(expression)
    for row_index, sample_id in enumerate(ids):
        sample_mutations = mutation_map.get(sample_id, {})
        sample_cna = cna_map.get(sample_id, {})
        for gene_index, gene in enumerate(FEATURE_GENES):
            mutation[row_index, gene_index] = float(sample_mutations.get(gene, 0))
            copy_number[row_index, gene_index] = float(sample_cna.get(gene, 0))
    combined = np.concatenate([expression, mutation, copy_number], axis=1)
    development, heldout = train_test_split(
        np.arange(len(y)), test_size=0.2, random_state=42, stratify=y
    )
    active = _registry_active()
    params = active.get("params") or DEFAULT_PARAMS
    started = time.perf_counter()
    augmented = _make_pipeline(params)
    augmented.fit(combined[development], y[development])
    augmented_metrics = _classification_metrics(y[heldout], augmented.predict(combined[heldout]))
    training_time = (time.perf_counter() - started) * 1000
    evaluation = active.get("evaluation") or {}
    expression_metrics = evaluation.get("heldOutTest")
    if not expression_metrics:
        raise RuntimeError("The active model has no stored held-out evaluation")
    return {
        "status": "ready",
        "source": multi["source"],
        "sourceVersion": multi["sourceVersion"],
        "checkedAt": multi["checkedAt"],
        "dataVersion": multi["dataVersion"],
        "split": {"developmentSamples": len(development), "heldOutSamples": len(heldout), "testFraction": 0.2, "randomState": 42},
        "matchedSamples": len(ids),
        "featureCounts": {"expression": len(FEATURE_GENES), "mutation": len(FEATURE_GENES), "copyNumber": len(FEATURE_GENES), "combined": combined.shape[1]},
        "models": [
            {
                "name": "HistGradientBoosting v2 — expression only",
                "accuracy": expression_metrics["accuracy"],
                "weightedF1": expression_metrics["weightedF1"],
                "macroF1": expression_metrics["macroF1"],
                "trainingTimeMs": None,
                "modelVersion": active.get("id"),
                "note": "Stored held-out evaluation; active model and registry were not changed.",
            },
            {
                "name": "HistGradientBoosting — expression + mutation + GISTIC CNA",
                "accuracy": augmented_metrics["accuracy"],
                "weightedF1": augmented_metrics["weightedF1"],
                "macroF1": augmented_metrics["macroF1"],
                "trainingTimeMs": round(training_time, 1),
                "role": "experimental, not active",
            },
        ],
        "studies": multi["studies"],
        "clinicalDisclaimer": "Research-only comparison; not a diagnostic or treatment tool.",
    }


def get_survival_curve_data() -> dict[str, Any]:
    return get_survival_analysis()


def get_drug_availability() -> dict[str, Any]:
    return {
        "status": "not_loaded",
        "title": "Drug-response data not loaded",
        "reason": "No GDSC response or matched cell-line expression files are included. Cell-line response measurements are not patient treatment outcomes and must not be presented as patient-specific recommendations.",
        "requiredInputs": [
            "GDSC2 drug response matrix with a named release/date",
            "Cell-line expression matrix mapped to the 50 model genes",
            "Cell-line identifiers and a documented subtype mapping",
        ],
        "checkedSources": ["Genomics of Drug Sensitivity in Cancer (GDSC) — no files downloaded"],
        "sourceVersion": None,
        "checkedAt": _now(),
    }


def _ncbi_descriptions() -> tuple[dict[str, str], str]:
    cache_version = _data_version()
    path = _CACHE_DIR / f"ncbi-gene-descriptions-{cache_version}.json"
    try:
        if path.exists() and time.time() - path.stat().st_mtime < _SOURCE_CACHE_TTL:
            saved = json.loads(path.read_text(encoding="utf-8"))
            return saved["descriptions"], saved["retrievedAt"]
    except (OSError, json.JSONDecodeError, KeyError):
        pass
    term = " OR ".join(f"{gene}[Gene Name]" for gene in FEATURE_GENES)
    search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?" + urlencode(
        {"db": "gene", "term": f"({term}) AND 9606[Taxonomy ID]", "retmode": "json", "retmax": 100}
    )
    request = Request(search_url, headers={"User-Agent": "GeneClassifier research prototype"})
    with urlopen(request, timeout=60) as response:
        search = json.loads(response.read().decode("utf-8"))
    gene_ids = search.get("esearchresult", {}).get("idlist", [])
    descriptions: dict[str, str] = {}
    if gene_ids:
        summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?" + urlencode(
            {"db": "gene", "id": ",".join(gene_ids), "retmode": "json"}
        )
        request = Request(summary_url, headers={"User-Agent": "GeneClassifier research prototype"})
        with urlopen(request, timeout=60) as response:
            summary = json.loads(response.read().decode("utf-8"))
        for gene_id in summary.get("result", {}).get("uids", []):
            entry = summary["result"].get(gene_id, {})
            symbol = str(entry.get("name", "")).upper()
            text = str(entry.get("description", "")).strip()
            if symbol and text:
                descriptions[symbol] = text
    retrieved = _now()
    value = {"descriptions": descriptions, "retrievedAt": retrieved}
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value), encoding="utf-8")
    os.replace(temporary, path)
    return descriptions, retrieved


def get_gene_statistics(model_bundle: dict[str, Any]) -> list[dict[str, Any]]:
    version = _data_version()
    frame, x, y, _ = _cohort()
    importances = {
        gene: float(score)
        for gene, score in zip(model_bundle["features"], model_bundle["feature_importances"])
    }
    rank_order = sorted(FEATURE_GENES, key=lambda gene: importances.get(gene, 0.0), reverse=True)
    ranks = {gene: index + 1 for index, gene in enumerate(rank_order)}
    descriptions, retrieved = _ncbi_descriptions()
    records = []
    for index, gene in enumerate(FEATURE_GENES):
        gene_values = x[:, index]
        group_means = {}
        for class_index, subtype in enumerate(CANCER_SUBTYPES):
            values = gene_values[(y == class_index) & np.isfinite(gene_values)]
            group_means[SUBTYPE_LABELS[subtype]] = float(np.mean(values)) if len(values) else 0.0
        finite = gene_values[np.isfinite(gene_values)]
        records.append(
            {
                "gene": gene,
                "meanBySubtype": group_means,
                "overallMean": float(np.mean(finite)) if len(finite) else 0.0,
                "overallStd": float(np.std(finite)) if len(finite) else 0.0,
                "importanceRank": ranks.get(gene),
                "description": descriptions.get(gene),
                "descriptionSource": f"NCBI Gene, retrieved {retrieved[:10]}" if descriptions.get(gene) else None,
            }
        )
    return records


def _enrichr_query(genes: list[str], library: str) -> list[dict[str, Any]]:
    add_body = urlencode({"list": "\n".join(genes), "description": "GeneClassifier research biomarker panel"}).encode()
    request = Request(
        "https://maayanlab.cloud/Enrichr/addList",
        data=add_body,
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "GeneClassifier research prototype"},
    )
    with urlopen(request, timeout=60) as response:
        list_data = json.loads(response.read().decode("utf-8"))
    query = urlencode({"userListId": list_data["userListId"], "backgroundType": library})
    request = Request(
        f"https://maayanlab.cloud/Enrichr/enrich?{query}",
        headers={"Accept": "application/json", "User-Agent": "GeneClassifier research prototype"},
    )
    with urlopen(request, timeout=60) as response:
        enrichment = json.loads(response.read().decode("utf-8"))
    terms = []
    for row in enrichment.get(library, [])[:12]:
        terms.append(
            {
                "rank": int(row[0]),
                "term": str(row[1]),
                "pValue": float(row[2]),
                "adjustedPValue": float(row[6]),
                "overlappingGenes": [value for value in str(row[5]).split(";") if value],
                "geneSetSize": int(row[7]) if len(row) > 7 else None,
            }
        )
    return terms


def get_pathway_enrichment() -> dict[str, Any]:
    version = _data_version()
    cache_version = hashlib.sha256(f"{version}:Enrichr:KEGG_2021_Human:GO_Biological_Process_2023".encode()).hexdigest()[:20]

    def calculate() -> dict[str, Any]:
        biomarkers = get_biomarkers()
        selected = {}
        for subtype in CANCER_SUBTYPES:
            rows = [row for row in biomarkers if row["subtype"] == SUBTYPE_LABELS[subtype]]
            rows.sort(key=lambda row: row["adjustedPValue"])
            selected[subtype] = [row["gene"] for row in rows[:15]]
        libraries = ("KEGG_2021_Human", "GO_Biological_Process_2023")
        output = []
        for subtype, genes in selected.items():
            for library in libraries:
                terms = _enrichr_query(genes, library)
                output.extend(
                    {
                        **term,
                        "subtype": SUBTYPE_LABELS[subtype],
                        "library": library,
                    }
                    for term in terms
                )
        return {
            "status": "ready",
            "library": "Enrichr",
            "libraryVersion": "KEGG_2021_Human; GO_Biological_Process_2023",
            "note": "Each query uses the 15 most significant genes from the 50-gene panel for one subtype. The restricted panel limits enrichment power; results are exploratory.",
            "terms": output,
        }

    try:
        return _cached("pathways", cache_version, calculate, _SOURCE_CACHE_TTL)
    except Exception as exc:
        return {
            "status": "not_loaded",
            "library": "Enrichr",
            "libraryVersion": "KEGG_2021_Human; GO_Biological_Process_2023",
            "computedAt": None,
            "dataVersion": version,
            "note": f"Enrichment data not loaded: {exc}",
            "terms": [],
        }


def get_research_xai(model_bundle: dict[str, Any]) -> dict[str, Any]:
    active = _registry_active()
    version = hashlib.sha256(f"{_data_version()}:{active.get('id')}:research-xai-v1".encode()).hexdigest()[:20]

    def calculate() -> dict[str, Any]:
        _, x, y, _ = _cohort()
        development, heldout = train_test_split(
            np.arange(len(y)), test_size=0.2, random_state=42, stratify=y
        )
        x_dev, x_heldout, y_dev = x[development], x[heldout], y[development]
        pipeline = model_bundle["pipeline"]
        feature_indices = {gene: index for index, gene in enumerate(FEATURE_GENES)}
        importance = {
            gene: float(score)
            for gene, score in zip(model_bundle["features"], model_bundle["feature_importances"])
        }
        top = sorted(FEATURE_GENES, key=lambda gene: importance.get(gene, 0.0), reverse=True)
        sample_count = min(12, len(x_heldout))
        selected_rows = x_heldout[:sample_count]
        background = np.nanmedian(x_dev, axis=0)
        background = np.where(np.isfinite(background), background, 0.0)
        rng = np.random.default_rng(42)
        shapley = np.zeros(len(FEATURE_GENES), dtype=float)
        permutation_count = 8
        for sample in selected_rows:
            for _ in range(permutation_count):
                order = rng.permutation(len(FEATURE_GENES))
                current = background.copy()
                previous = pipeline.predict_proba(pd.DataFrame([current], columns=FEATURE_GENES))[0]
                for index in order:
                    current[index] = sample[index] if np.isfinite(sample[index]) else background[index]
                    updated = pipeline.predict_proba(pd.DataFrame([current], columns=FEATURE_GENES))[0]
                    shapley[index] += float(np.mean(np.abs(updated - previous)))
                    previous = updated
        shapley /= max(1, sample_count * permutation_count)

        params = active.get("params") or DEFAULT_PARAMS
        fold_values: list[np.ndarray] = []
        splitter = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        for train_idx, valid_idx in splitter.split(x_dev, y_dev):
            fold_model = _make_pipeline(params)
            fold_model.fit(x_dev[train_idx], y_dev[train_idx])
            scores = permutation_importance(
                fold_model,
                x_dev[valid_idx],
                y_dev[valid_idx],
                n_repeats=2,
                random_state=42,
                n_jobs=1,
                scoring="accuracy",
            ).importances_mean
            fold_values.append(scores)
        ranks_by_fold = np.argsort(np.argsort(-np.vstack(fold_values), axis=1), axis=1) + 1
        fold_stability = [
            {
                "gene": gene,
                "meanPermutationImportance": float(np.mean([row[feature_indices[gene]] for row in fold_values])),
                "meanRank": float(np.mean(ranks_by_fold[:, feature_indices[gene]])),
                "rankMin": int(np.min(ranks_by_fold[:, feature_indices[gene]])),
                "rankMax": int(np.max(ranks_by_fold[:, feature_indices[gene]])),
            }
            for gene in FEATURE_GENES
        ]
        values = [
            {
                "gene": gene,
                "permutationImportance": importance.get(gene, 0.0),
                "monteCarloShapleyEstimate": float(shapley[feature_indices[gene]]),
            }
            for gene in FEATURE_GENES
        ]
        values.sort(key=lambda item: item["monteCarloShapleyEstimate"], reverse=True)
        return {
            "status": "ready",
            "method": "Monte Carlo interventional Shapley approximation on held-out samples; 8 feature permutations per sample. This is a separate research comparison, not the active v2 per-sample explanation method.",
            "values": values,
            "foldStability": fold_stability,
            "note": "Cross-validation rank stability is computed on the development split only. Held-out records are not used to fit fold models.",
        }

    return _cached("research-xai", version, calculate, _SOURCE_CACHE_TTL)


def get_reference_gene_info() -> dict[str, Any]:
    try:
        descriptions, retrieved = _ncbi_descriptions()
        return {
            "source": "NCBI Gene",
            "sourceVersion": "Entrez Gene API",
            "retrievedAt": retrieved,
            "descriptions": descriptions,
        }
    except Exception as exc:
        return {"source": "NCBI Gene", "sourceVersion": "Entrez Gene API", "retrievedAt": None, "descriptions": {}, "error": str(exc)}

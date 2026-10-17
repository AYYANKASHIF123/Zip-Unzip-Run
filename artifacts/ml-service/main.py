import io
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from model import (
    load_or_train_model, predict, explain, train_new_version,
    load_registry, FEATURE_GENES, run_result_trust_checks,
)
from research import (
    evaluate_labeled_samples,
    get_biomarkers,
    get_data_status,
    get_drug_availability,
    get_gene_statistics,
    get_genomics,
    get_multiomics_availability,
    get_pathway_enrichment,
    get_ppi_network,
    get_research_xai,
    get_survival_analysis,
    run_federated_simulation,
    run_gnn_comparison,
    run_multiomics_comparison,
)

app = FastAPI(title="GeneClassifier ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_model_bundle: dict | None = None


@app.on_event("startup")
async def startup_event():
    global _model_bundle
    _model_bundle = load_or_train_model()


def _require_model():
    if _model_bundle is None:
        raise HTTPException(503, "Model not yet loaded — please retry in a moment")
    return _model_bundle


async def _parse_csv(file: UploadFile) -> pd.DataFrame:
    name = (file.filename or "").lower()
    if not (name.endswith(".csv") or name.endswith(".tsv")):
        raise HTTPException(400, "Only .csv or .tsv files are accepted")
    content = await file.read()
    sep = "\t" if name.endswith(".tsv") else ","
    try:
        df = pd.read_csv(io.BytesIO(content), sep=sep)
    except Exception as exc:
        raise HTTPException(400, f"Could not parse file: {exc}")
    if df.empty:
        raise HTTPException(400, "Uploaded file contains no data rows")
    return df


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/ml/healthz")
def health():
    return {
        "status":   "ok",
        "model":    "HistGradientBoosting v2.0 (real TCGA PanCancer Atlas data)",
        "genes":    len(FEATURE_GENES),
        "subtypes": ["BRCA", "LUAD", "COAD", "GBM", "PRAD"],
    }


# ── Predict ────────────────────────────────────────────────────────────────────

@app.post("/ml/predict")
async def predict_endpoint(file: UploadFile = File(...)):
    bundle = _require_model()
    df = await _parse_csv(file)
    try:
        results = predict(bundle, df)
    except Exception as exc:
        raise HTTPException(500, f"Prediction failed: {exc}")
    return {
        "predictions":     results,
        "totalSamples":    len(results),
        "modelVersion":    "HistGradientBoosting v2.0",
        "featuresUsed":    results[0]["genesMatched"] if results else 0,
        "featuresMissing": results[0]["genesMissing"] if results else 0,
    }


# ── Explainability ─────────────────────────────────────────────────────────────

@app.get("/ml/features/importance")
def feature_importance():
    bundle = _require_model()
    importances     = bundle["feature_importances"]
    per_class_means = bundle["per_class_means"]
    genes           = bundle["features"]
    ranked = sorted(
        [{"gene": g, "importance": round(imp, 6), "rank": 0}
         for g, imp in zip(genes, importances)],
        key=lambda x: x["importance"], reverse=True,
    )
    for i, item in enumerate(ranked):
        item["rank"] = i + 1
        item["perClassMean"] = {
            sub: per_class_means[sub][item["gene"]]
            for sub in per_class_means
        }
    return {"genes": ranked, "method": "Permutation Importance", "model": "HistGradientBoosting v2.0"}


@app.post("/ml/explain")
async def explain_endpoint(file: UploadFile = File(...)):
    bundle = _require_model()
    df = await _parse_csv(file)
    try:
        results = explain(bundle, df)
    except Exception as exc:
        raise HTTPException(500, f"Explanation failed: {exc}")
    return {"explanations": results, "model": "HistGradientBoosting v2.0", "method": "permutation_importance × (value − class_mean)"}


# ── Model versioning ───────────────────────────────────────────────────────────

@app.get("/ml/models")
def list_models():
    """Return all trained model versions from the registry."""
    return load_registry()


@app.post("/ml/models/evaluation/checks/run")
def run_model_evaluation_checks():
    try:
        run_result_trust_checks()
        registry = load_registry()
        active = next(
            (version for version in registry.get("versions", []) if version.get("isActive")),
            None,
        )
        if active is None:
            raise RuntimeError("No active model is registered after checks")
        return {
            "activeVersionId": registry.get("activeVersionId"),
            "evaluation": active.get("evaluation"),
        }
    except RuntimeError as exc:
        raise HTTPException(409, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Result trust checks failed: {exc}")


class TrainRequest(BaseModel):
    max_iter:          int = 300
    learning_rate:     float = 0.05
    max_depth:         int | None = None
    l2_regularization: float = 0.0


class FederatedRequest(BaseModel):
    clients: int = 3
    rounds: int = 10
    unequalClassMix: bool = False


class ExternalValidationSample(BaseModel):
    sampleId: str
    trueSubtype: str
    values: dict[str, float | None]


class ExternalValidationRequest(BaseModel):
    sourceName: str
    sourceVersion: str | None = None
    independentSourceConfirmed: bool = False
    samples: list[ExternalValidationSample]


@app.post("/ml/models/train")
def train_model(body: TrainRequest):
    """
    Train a new HistGradientBoosting version with the supplied hyperparameters.
    Runs 5-fold cross-validation for honest accuracy/F1 estimates.
    Blocks until training is complete (typically 5-15 s).
    """
    global _model_bundle
    try:
        version, bundle = train_new_version(body.model_dump())
        _model_bundle = bundle
        return {"success": True, "version": version}
    except RuntimeError as exc:
        raise HTTPException(409, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Training failed: {exc}")


# ── Features list ──────────────────────────────────────────────────────────────

@app.get("/ml/features")
def features():
    return {"genes": FEATURE_GENES, "count": len(FEATURE_GENES)}


# ── Independent research endpoints ────────────────────────────────────────────
# These endpoints never write to the model registry or replace the serving bundle.

@app.get("/ml/research/status")
def research_status():
    try:
        return get_data_status()
    except Exception as exc:
        raise HTTPException(503, f"Research data status unavailable: {exc}")


@app.get("/ml/research/ppi")
def research_ppi():
    try:
        return get_ppi_network(_require_model())
    except Exception as exc:
        raise HTTPException(503, f"STRING network unavailable: {exc}")


@app.get("/ml/research/genomics")
def research_genomics():
    try:
        return get_genomics()
    except Exception as exc:
        raise HTTPException(503, f"Genomics computation failed: {exc}")


@app.get("/ml/research/biomarkers")
def research_biomarkers():
    try:
        return get_biomarkers()
    except Exception as exc:
        raise HTTPException(503, f"Biomarker computation failed: {exc}")


@app.get("/ml/research/pathways")
def research_pathways():
    return get_pathway_enrichment()


@app.get("/ml/research/genes")
def research_genes():
    try:
        return get_gene_statistics(_require_model())
    except Exception as exc:
        raise HTTPException(503, f"Gene statistics unavailable: {exc}")


@app.get("/ml/research/survival")
def research_survival():
    return get_survival_analysis()


@app.get("/ml/research/drugs")
def research_drugs():
    return get_drug_availability()


@app.get("/ml/research/multi-omics")
def research_multiomics_status():
    return get_multiomics_availability()


@app.post("/ml/research/multi-omics/run")
def research_multiomics_run():
    try:
        return run_multiomics_comparison()
    except Exception as exc:
        raise HTTPException(503, f"Matched mutation/CNA evaluation failed: {exc}")


@app.get("/ml/research/xai")
def research_xai():
    try:
        return get_research_xai(_require_model())
    except Exception as exc:
        raise HTTPException(503, f"Research explainability unavailable: {exc}")


@app.post("/ml/research/gnn/run")
def research_gnn():
    try:
        model_bundle = _require_model()
        network = get_ppi_network(model_bundle)
        return run_gnn_comparison(model_bundle, network)
    except Exception as exc:
        raise HTTPException(503, f"Experimental GNN comparison failed: {exc}")


@app.post("/ml/research/federated/run")
def research_federated(body: FederatedRequest):
    try:
        return run_federated_simulation(body.model_dump())
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(503, f"Federated simulation failed: {exc}")


@app.post("/ml/research/validation/evaluate")
def research_validate(body: ExternalValidationRequest):
    try:
        return evaluate_labeled_samples(
            _require_model(),
            body.model_dump(),
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(503, f"Labeled-data evaluation failed: {exc}")

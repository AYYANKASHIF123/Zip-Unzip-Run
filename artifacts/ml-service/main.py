import io
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from model import (
    load_or_train_model, predict, explain, train_new_version,
    load_registry, FEATURE_GENES,
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


class TrainRequest(BaseModel):
    max_iter:          int = 300
    learning_rate:     float = 0.05
    max_depth:         int | None = None
    l2_regularization: float = 0.0


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

import io
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from model import load_or_train_model, predict, explain, FEATURE_GENES

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


@app.get("/ml/healthz")
def health():
    return {
        "status":   "ok",
        "model":    "RandomForest v1.0",
        "genes":    len(FEATURE_GENES),
        "subtypes": ["BRCA", "LUAD", "COAD", "GBM", "PRAD"],
    }


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
        "modelVersion":    "RandomForest v1.0",
        "featuresUsed":    results[0]["genesMatched"] if results else 0,
        "featuresMissing": results[0]["genesMissing"] if results else 0,
    }


@app.get("/ml/features/importance")
def feature_importance():
    """
    Returns global Random Forest feature importances (MDI) for all 50 genes,
    plus per-class scaled means so the frontend can show which direction each
    gene pushes each cancer subtype.
    """
    bundle = _require_model()
    importances   = bundle["feature_importances"]
    per_class_means = bundle["per_class_means"]
    genes         = bundle["features"]

    ranked = sorted(
        [{"gene": g, "importance": round(imp, 6), "rank": 0}
         for g, imp in zip(genes, importances)],
        key=lambda x: x["importance"],
        reverse=True,
    )
    for i, item in enumerate(ranked):
        item["rank"] = i + 1
        item["perClassMean"] = {
            subtype: per_class_means[subtype][item["gene"]]
            for subtype in per_class_means
        }

    return {
        "genes":  ranked,
        "method": "MDI (Mean Decrease in Impurity)",
        "model":  "RandomForest v1.0",
        "nTrees": 200,
    }


@app.post("/ml/explain")
async def explain_endpoint(file: UploadFile = File(...)):
    """
    Per-sample SHAP-style feature attribution.
    Contribution_i = importance_i × (scaled_value_i − class_mean_i)
    """
    bundle = _require_model()
    df = await _parse_csv(file)
    try:
        results = explain(bundle, df)
    except Exception as exc:
        raise HTTPException(500, f"Explanation failed: {exc}")
    return {"explanations": results, "model": "RandomForest v1.0", "method": "importance × (value − class_mean)"}


@app.get("/ml/features")
def features():
    return {"genes": FEATURE_GENES, "count": len(FEATURE_GENES)}

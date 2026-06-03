import io
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from model import load_or_train_model, predict, FEATURE_GENES

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


@app.get("/ml/healthz")
def health():
    return {
        "status": "ok",
        "model":  "RandomForest v1.0",
        "genes":  len(FEATURE_GENES),
        "subtypes": ["BRCA", "LUAD", "COAD", "GBM", "PRAD"],
    }


@app.post("/ml/predict")
async def predict_endpoint(file: UploadFile = File(...)):
    if _model_bundle is None:
        raise HTTPException(503, "Model not yet loaded — please retry in a moment")

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

    try:
        results = predict(_model_bundle, df)
    except Exception as exc:
        raise HTTPException(500, f"Prediction failed: {exc}")

    return {
        "predictions":    results,
        "totalSamples":   len(results),
        "modelVersion":   "RandomForest v1.0",
        "featuresUsed":   results[0]["genesMatched"] if results else 0,
        "featuresMissing": results[0]["genesMissing"] if results else 0,
    }


@app.get("/ml/features")
def features():
    return {"genes": FEATURE_GENES, "count": len(FEATURE_GENES)}

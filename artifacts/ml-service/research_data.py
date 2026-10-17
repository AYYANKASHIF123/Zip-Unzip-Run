"""Public cBioPortal data access for the research-only analyses."""

from __future__ import annotations

import hashlib
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

import pandas as pd

from model import CANCER_SUBTYPES, FEATURE_GENES, TRAINING_DATA_PATH

CBIO_BASE = "https://www.cbioportal.org/api"
CBIO_STUDIES = {
    "BRCA": "brca_tcga_pan_can_atlas_2018",
    "LUAD": "luad_tcga_pan_can_atlas_2018",
    "COAD": "coadread_tcga_pan_can_atlas_2018",
    "GBM": "gbm_tcga_pan_can_atlas_2018",
    "PRAD": "prad_tcga_pan_can_atlas_2018",
}
_CACHE_DIR = Path(__file__).resolve().parent / ".cache" / "public-data"
_CACHE_DIR.mkdir(parents=True, exist_ok=True)
_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60


def _training_version() -> str:
    digest = hashlib.sha256()
    with open(TRAINING_DATA_PATH, "rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()[:16]


def _cache_read(name: str, version: str) -> Any | None:
    path = _CACHE_DIR / f"{name}-{version}.json"
    try:
        if time.time() - path.stat().st_mtime > _CACHE_TTL_SECONDS:
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _cache_write(name: str, version: str, value: Any) -> None:
    path = _CACHE_DIR / f"{name}-{version}.json"
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, separators=(",", ":")), encoding="utf-8")
    os.replace(temporary, path)


def _request_json(path: str, *, body: dict[str, Any] | None = None, query: dict[str, Any] | None = None) -> Any:
    url = f"{CBIO_BASE}{path}"
    if query:
        url += "?" + urlencode(query)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = Request(
        url,
        data=data,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "GeneClassifier research prototype",
        },
        method="POST" if body is not None else "GET",
    )
    try:
        with urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"cBioPortal request failed for {path}: {exc}") from exc


def get_cohort_match_status() -> dict[str, Any]:
    version = _training_version()
    cached = _cache_read("cbioportal-manifest", version)
    if cached:
        return cached

    frame = pd.read_csv(TRAINING_DATA_PATH, usecols=["sample_id", "subtype"])
    studies: list[dict[str, Any]] = []
    for subtype in CANCER_SUBTYPES:
        study_id = CBIO_STUDIES[subtype]
        source_samples = frame.loc[frame["subtype"] == subtype, "sample_id"].astype(str).tolist()
        sample_lists = _request_json(f"/studies/{study_id}/sample-lists", query={"projection": "SUMMARY"})
        all_list = next(
            (sample_list for sample_list in sample_lists if sample_list.get("sampleListId", "").endswith("_all")),
            None,
        )
        if all_list is None:
            raise RuntimeError(f"cBioPortal did not expose the all-samples list for {study_id}")
        portal_samples = _request_json(f"/sample-lists/{all_list['sampleListId']}/sample-ids")
        overlap = set(source_samples).intersection(str(sample_id) for sample_id in portal_samples)
        profiles = _request_json(f"/studies/{study_id}/molecular-profiles", query={"projection": "SUMMARY"})
        attributes = _request_json(f"/studies/{study_id}/clinical-attributes", query={"projection": "SUMMARY"})
        profile_ids = [profile["molecularProfileId"] for profile in profiles]
        attribute_ids = [attribute["clinicalAttributeId"] for attribute in attributes]
        studies.append(
            {
                "subtype": subtype,
                "studyId": study_id,
                "trainingSamples": len(source_samples),
                "matchedSamples": len(overlap),
                "portalSamples": len(portal_samples),
                "exactSampleSetMatch": len(overlap) == len(source_samples) == len(portal_samples),
                "profiles": profile_ids,
                "clinicalAttributes": attribute_ids,
            }
        )

    result = {
        "source": "cBioPortal TCGA PanCancer Atlas 2018",
        "sourceVersion": "PanCancer Atlas 2018; cBioPortal public API v3",
        "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dataVersion": version,
        "studies": studies,
        "allSamplesMatch": all(study["exactSampleSetMatch"] for study in studies),
    }
    _cache_write("cbioportal-manifest", version, result)
    return result


def _get_gene_ids() -> dict[str, int]:
    version = _training_version()
    cached = _cache_read("cbioportal-gene-ids", version)
    if cached:
        return {str(key): int(value) for key, value in cached.items()}

    def get_one(gene: str) -> tuple[str, int | None]:
        rows = _request_json(
            "/genes",
            query={"keyword": gene, "pageSize": 20, "projection": "SUMMARY"},
        )
        exact = next(
            (
                row
                for row in rows
                if str(row.get("hugoGeneSymbol", "")).upper() == gene.upper()
            ),
            None,
        )
        return gene, int(exact["entrezGeneId"]) if exact else None

    with ThreadPoolExecutor(max_workers=5) as executor:
        mappings = dict(executor.map(get_one, FEATURE_GENES))
    missing = [gene for gene, entrez_id in mappings.items() if entrez_id is None]
    if missing:
        raise RuntimeError(f"cBioPortal gene identifiers were unavailable for: {', '.join(missing)}")
    complete = {gene: int(entrez_id) for gene, entrez_id in mappings.items() if entrez_id is not None}
    _cache_write("cbioportal-gene-ids", version, complete)
    return complete


def get_survival_records() -> dict[str, Any]:
    version = _training_version()
    cached = _cache_read("cbioportal-survival", version)
    if cached:
        return cached

    manifest = get_cohort_match_status()
    if not manifest["allSamplesMatch"]:
        raise RuntimeError("cBioPortal sample IDs do not exactly match the expression cohort")

    frame = pd.read_csv(TRAINING_DATA_PATH, usecols=["sample_id", "subtype"])
    output: list[dict[str, Any]] = []
    for subtype in CANCER_SUBTYPES:
        study_id = CBIO_STUDIES[subtype]
        selected = frame[frame["subtype"] == subtype]
        patient_ids = sorted({str(sample_id)[:12] for sample_id in selected["sample_id"]})
        clinical_rows = _request_json(
            f"/studies/{study_id}/clinical-data/fetch",
            body={"ids": patient_ids, "attributeIds": ["OS_MONTHS", "OS_STATUS"]},
            query={"clinicalDataType": "PATIENT", "projection": "SUMMARY"},
        )
        clinical_by_patient: dict[str, dict[str, str]] = {}
        for row in clinical_rows:
            patient_id = str(row.get("patientId", ""))
            clinical_by_patient.setdefault(patient_id, {})[str(row.get("clinicalAttributeId", ""))] = str(row.get("value", ""))
        for sample_id in selected["sample_id"].astype(str):
            patient_id = sample_id[:12]
            fields = clinical_by_patient.get(patient_id, {})
            raw_months = fields.get("OS_MONTHS")
            raw_status = fields.get("OS_STATUS", "").upper()
            try:
                months = float(raw_months) if raw_months not in (None, "", "NA", "NaN") else None
            except ValueError:
                months = None
            if months is None or months < 0 or raw_status not in ("0:LIVING", "1:DECEASED"):
                continue
            output.append(
                {
                    "sampleId": sample_id,
                    "patientId": patient_id,
                    "subtype": subtype,
                    "timeMonths": months,
                    "event": raw_status == "1:DECEASED",
                }
            )
    result = {
        "source": "cBioPortal TCGA PanCancer Atlas 2018 clinical data",
        "sourceVersion": "OS_MONTHS and OS_STATUS; cBioPortal public API v3",
        "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dataVersion": version,
        "manifest": manifest,
        "records": output,
    }
    if not output:
        raise RuntimeError("cBioPortal returned no usable OS_MONTHS / OS_STATUS records")
    _cache_write("cbioportal-survival", version, result)
    return result


def get_multiomics_matrices() -> dict[str, Any]:
    version = _training_version()
    cached = _cache_read("cbioportal-multiomics", version)
    if cached:
        return cached

    manifest = get_cohort_match_status()
    if not manifest["allSamplesMatch"]:
        raise RuntimeError("cBioPortal sample IDs do not exactly match the expression cohort")
    gene_ids = _get_gene_ids()
    gene_by_id = {value: key for key, value in gene_ids.items()}
    frame = pd.read_csv(TRAINING_DATA_PATH, usecols=["sample_id", "subtype"])
    mutations: dict[str, dict[str, int]] = {}
    cna: dict[str, dict[str, float]] = {}
    study_summaries: list[dict[str, Any]] = []

    for subtype in CANCER_SUBTYPES:
        study_id = CBIO_STUDIES[subtype]
        sample_ids = frame.loc[frame["subtype"] == subtype, "sample_id"].astype(str).tolist()
        profiles = _request_json(f"/studies/{study_id}/molecular-profiles", query={"projection": "SUMMARY"})
        profile_ids = [profile["molecularProfileId"] for profile in profiles]
        mutation_profile = next((profile for profile in profile_ids if profile.endswith("_mutations")), None)
        cna_profile = next((profile for profile in profile_ids if profile.endswith("_gistic")), None)
        if not mutation_profile or not cna_profile:
            raise RuntimeError(f"Mutation or GISTIC profile missing for {study_id}")

        mutation_rows = _request_json(
            f"/molecular-profiles/{quote(mutation_profile, safe='')}/mutations/fetch",
            body={"sampleIds": sample_ids, "entrezGeneIds": list(gene_by_id)},
            query={"projection": "SUMMARY", "pageSize": 1000000, "pageNumber": 0},
        )
        cna_rows = _request_json(
            f"/molecular-profiles/{quote(cna_profile, safe='')}/molecular-data/fetch",
            body={"sampleIds": sample_ids, "entrezGeneIds": list(gene_by_id)},
            query={"projection": "SUMMARY"},
        )

        for row in mutation_rows:
            symbol = gene_by_id.get(int(row.get("entrezGeneId", -1)))
            sample_id = str(row.get("sampleId", ""))
            if symbol and sample_id:
                mutations.setdefault(sample_id, {})[symbol] = 1
        for row in cna_rows:
            symbol = gene_by_id.get(int(row.get("entrezGeneId", -1)))
            sample_id = str(row.get("sampleId", ""))
            if not symbol or not sample_id:
                continue
            try:
                cna.setdefault(sample_id, {})[symbol] = float(row.get("value", 0))
            except (TypeError, ValueError):
                continue
        study_summaries.append(
            {
                "studyId": study_id,
                "sampleCount": len(sample_ids),
                "mutationRecords": len(mutation_rows),
                "copyNumberRecords": len(cna_rows),
                "mutationProfile": mutation_profile,
                "copyNumberProfile": cna_profile,
            }
        )

    result = {
        "source": "cBioPortal TCGA PanCancer Atlas 2018",
        "sourceVersion": "Mutation and GISTIC profiles; cBioPortal public API v3",
        "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dataVersion": version,
        "genes": list(FEATURE_GENES),
        "mutations": mutations,
        "copyNumber": cna,
        "studies": study_summaries,
    }
    _cache_write("cbioportal-multiomics", version, result)
    return result

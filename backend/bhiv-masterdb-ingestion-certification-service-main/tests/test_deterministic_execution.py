"""
Deterministic 50-Run Execution Verification Test.

Proves that running validation and certification 50 consecutive times on the
canonical certifiable sample dataset yields identical verdicts, scores, rule
evaluations, and cryptographic SHA-256 digest across all 50 iterations with 0 drift.
"""
import hashlib
import json
from pathlib import Path
import pytest

from services.artifact_store import ArtifactStore
from services.certification_service import CertificationService
from services.validation_service import ValidationService

ROOT = Path(__file__).resolve().parents[1]


def canonicalize_report(report: dict) -> dict:
    """Extract and normalize all invariant deterministic fields from report."""
    decision = report.get("ingestion_decision", {})
    audit = [
        {
            "rule": item.get("rule"),
            "from_state": item.get("from_state"),
            "to_state": item.get("to_state"),
            "passed": item.get("passed"),
            "reason": item.get("reason"),
        }
        for item in report.get("audit_trail", [])
    ]
    return {
        "dataset_id": report.get("dataset_id"),
        "state": report.get("state"),
        "integrity_score": report.get("integrity_score"),
        "classification": report.get("classification"),
        "risk_flags": sorted(report.get("risk_flags", [])),
        "eligible_for_masterdb": decision.get("eligible_for_masterdb"),
        "rejection_reasons": sorted(decision.get("rejection_reasons", [])),
        "audit_trail": audit,
    }


def compute_report_hash(report: dict) -> str:
    canonical = canonicalize_report(report)
    canonical_json = json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(canonical_json).hexdigest()


def test_50_run_deterministic_execution(tmp_path):
    """Execute 50 consecutive runs and verify bit-for-bit identical state hash."""
    store = ArtifactStore(str(tmp_path))
    validator = ValidationService(artifact_store=store)
    certifier = CertificationService(validation_service=validator, artifact_store=store)

    dataset_path = str(ROOT / "datasets" / "certifiable_sample.csv")
    metadata_path = str(ROOT / "datasets" / "metadata.json")

    hashes = []
    for iteration in range(50):
        report = certifier.certify(
            dataset_id=f"deterministic-run-{iteration}",
            dataset_path=dataset_path,
            metadata_path=metadata_path,
        )
        # Normalize dataset_id in the extracted canonical report to verify logic invariance
        report_copy = dict(report)
        report_copy["dataset_id"] = "certifiable_sample"
        h = compute_report_hash(report_copy)
        hashes.append(h)

    # Verification: all 50 hashes must be strictly equal
    first_hash = hashes[0]
    assert len(hashes) == 50
    assert all(h == first_hash for h in hashes), "Deterministic hash drift detected across 50 runs!"
    assert first_hash is not None
    assert len(first_hash) == 64

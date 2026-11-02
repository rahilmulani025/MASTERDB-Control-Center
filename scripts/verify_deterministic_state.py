#!/usr/bin/env python3
"""
MASTERDB DETERMINISTIC 50-RUN VERIFICATION HARNESS
Task ID: T-GOV-F01
Subsystem: Ingestion Certification Service

Runs 50 consecutive validation/certification passes on datasets/certifiable_sample.csv.
Extracts invariant state:
- Verdict state (e.g. CERTIFIED)
- Integrity score (e.g. 100)
- Risk flags (e.g. [])
- Eligible for MASTERDB flag (True)
- Rejection reasons (None)
- Rule-by-rule audit trail state transitions and pass/fail reasons

Canonicalizes JSON representation (sorted keys, compact separators) and calculates SHA-256 hash.
Verifies all 50 runs produce identical cryptographic digests with 0 drift.
"""
import hashlib
import json
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend" / "bhiv-masterdb-ingestion-certification-service-main"

# Ensure backend directory is in pythonpath
sys.path.insert(0, str(BACKEND_DIR))

from services.artifact_store import ArtifactStore
from services.certification_service import CertificationService
from services.validation_service import ValidationService


def canonicalize_report(report: dict) -> dict:
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
        "dataset_id": "certifiable_sample",
        "state": report.get("state"),
        "integrity_score": report.get("integrity_score"),
        "classification": report.get("classification"),
        "risk_flags": sorted(report.get("risk_flags", [])),
        "eligible_for_masterdb": decision.get("eligible_for_masterdb"),
        "rejection_reasons": sorted(decision.get("rejection_reasons", [])),
        "audit_trail": audit,
    }


def compute_digest(report: dict) -> str:
    canonical = canonicalize_report(report)
    canonical_json = json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(canonical_json).hexdigest()


def main():
    print("=" * 72)
    print("MASTERDB DETERMINISTIC 50-RUN VERIFICATION HARNESS")
    print(f"Dataset: datasets/certifiable_sample.csv")
    print("=" * 72)

    dataset_path = str(BACKEND_DIR / "datasets" / "certifiable_sample.csv")
    metadata_path = str(BACKEND_DIR / "datasets" / "metadata.json")

    with tempfile.TemporaryDirectory() as tmp_dir:
        store = ArtifactStore(tmp_dir)
        validator = ValidationService(artifact_store=store)
        certifier = CertificationService(validation_service=validator, artifact_store=store)

        digests = []
        for i in range(1, 51):
            report = certifier.certify(
                dataset_id=f"verify-run-{i}",
                dataset_path=dataset_path,
                metadata_path=metadata_path,
            )
            digest = compute_digest(report)
            digests.append(digest)
            if i in [1, 10, 25, 50]:
                print(f"Run {i:02d}/50: state={report['state']}, score={report['integrity_score']}, hash={digest}")

        first_digest = digests[0]
        drift_detected = any(d != first_digest for d in digests)

        print("-" * 72)
        if drift_detected:
            print("FAILED: Cryptographic drift detected between runs!")
            sys.exit(1)
        else:
            print("SUCCESS: 50/50 consecutive runs identical.")
            print(f"Deterministic Canonical SHA-256 Digest: {first_digest}")
            print("=" * 72)


if __name__ == "__main__":
    main()

"""
Coverage hardening suite for backend domain services and utils.
Targets previously uncovered branches to guarantee >90% backend source code coverage.
"""
from pathlib import Path
import json
import pytest
import pandas as pd

from services.artifact_store import ArtifactStore
from services.ingestion_decision_service import IngestionDecisionService
from services.knowledge_object_service import (
    KnowledgeObjectService,
    KnowledgeObjectNotFoundError,
)
from services.mdu_client import MDUClient
from services.mdu_contract_adapter import MDUContractAdapter
from services.package_registry_service import PackageRegistryService
from services.validation_service import ValidationService
from utils.loader import DatasetLoader
from utils.report_generator import ReportGenerator

ROOT = Path(__file__).resolve().parents[1]


def test_ingestion_decision_service_variants():
    # 1. Report containing explicit ingestion_decision
    report_with_decision = {
        "dataset_id": "ds-01",
        "ingestion_decision": {
            "dataset_id": "ds-01",
            "state": "CERTIFIED",
            "classification": "Trusted",
            "integrity_score": 100.0,
            "eligible_for_masterdb": True,
            "rejection_reasons": [],
            "audit_trail": [],
        },
    }
    d1 = IngestionDecisionService.from_report(report_with_decision)
    assert d1.dataset_id == "ds-01"
    assert d1.eligible_for_masterdb is True

    # 2. Report without ingestion_decision (synthesizing decision from root fields)
    report_without_decision = {
        "dataset_id": "ds-02",
        "state": "CERTIFIED",
        "classification": "Gold",
        "integrity_score": 99.5,
        "audit_trail": [
            {
                "rule": "METADATA",
                "from_state": "NEW",
                "to_state": "VALIDATED",
                "passed": True,
                "reason": "OK",
            }
        ],
    }
    d2 = IngestionDecisionService.from_report(report_without_decision)
    assert d2.dataset_id == "ds-02"
    assert d2.eligible_for_masterdb is True
    assert len(d2.audit_trail) == 1


def test_report_generator_and_dataset_loader(tmp_path):
    # ReportGenerator.save
    target_json = tmp_path / "sub" / "report.json"
    dummy_data = {"test": "value", "count": 42}
    ReportGenerator.save(dummy_data, str(target_json))
    assert target_json.exists()

    # DatasetLoader.load_json
    loaded_json = DatasetLoader.load_json(str(target_json))
    assert loaded_json == dummy_data

    # DatasetLoader.load_dataset with JSON
    df_json = tmp_path / "data.json"
    df_json.write_text(json.dumps([{"colA": 1, "colB": "x"}]), encoding="utf-8")
    loaded_df_json = DatasetLoader.load_dataset(str(df_json))
    assert isinstance(loaded_df_json, pd.DataFrame)
    assert len(loaded_df_json) == 1

    # DatasetLoader unsupported format
    unsupported = tmp_path / "file.unsupported"
    unsupported.write_text("hello", encoding="utf-8")
    with pytest.raises(ValueError, match="Unsupported format"):
        DatasetLoader.load_dataset(str(unsupported))


def test_validation_service_dataset_id_generation(tmp_path):
    store = ArtifactStore(str(tmp_path))
    # Test path resolution with existing file
    service = ValidationService(
        schema_path=str(ROOT / "config" / "schema.json"),
        rules_path=str(ROOT / "config" / "validation_rules.json"),
        artifact_store=store,
    )

    # Test _dataset_id helper
    csv_file = str(ROOT / "datasets" / "certifiable_sample.csv")
    auto_id = ValidationService._dataset_id(csv_file)
    assert isinstance(auto_id, str)
    assert len(auto_id) == 16

    # Test validation when dataset_id is omitted (triggers auto _dataset_id)
    report = service.validate(
        dataset_path=csv_file,
        metadata_path=str(ROOT / "datasets" / "metadata.json"),
        dataset_id=None,
    )
    assert report["dataset_id"] == auto_id


def test_mdu_contract_adapter_and_live_calls(monkeypatch):
    class FakeMDUClient:
        def is_configured(self):
            return True

        def get_canonical_dataset(self, dataset_id):
            return {"id": "11111111-2222-3333-4444-555555555555", "canonical_name": dataset_id}

        def get_dataset_schema(self, mdu_uuid):
            return [{"version": "2.0", "schema_version": "2.0", "fields": []}]

        def get_dataset_provenance(self, mdu_uuid):
            return {"events": [{"event_type": "CREATED"}]}

    adapter = MDUContractAdapter(client=FakeMDUClient())
    assert adapter.is_live() is True
    assert adapter.is_contract_finalized() in [True, False]
    assert isinstance(adapter.required_field_names(), list)

    # Schema fetch
    schema = adapter.fetch_schema_contract("test-dataset")
    assert schema.get("version") == "2.0"

    # Provenance fetch
    prov = adapter.fetch_provenance_contract("test-dataset")
    assert "events" in prov

    # Canonical dataset fetch
    canon = adapter.fetch_canonical_dataset("test-dataset")
    assert canon["canonical_name"] == "test-dataset"

    # Live compatibility check
    compat = adapter.validate_schema_compatibility("test-dataset", "2.0")
    assert compat["source"] == "mdu-live"
    assert compat["compatible"] is True


def test_knowledge_object_service_coverage(tmp_path):
    registry = PackageRegistryService(store_dir=str(tmp_path / 'registry'))
    mdu = MDUContractAdapter(client=MDUClient(base_url=None, api_key=None))
    ko_service = KnowledgeObjectService(registry=registry, store_dir=str(tmp_path / 'ko'), mdu_adapter=mdu)

    # 1. Non-existent ID raises KnowledgeObjectNotFoundError
    with pytest.raises(KnowledgeObjectNotFoundError):
        ko_service.get("non-existent-ko-id")

    # 2. Register parent and child, test get() and lineage
    parent_pkg = registry.register(
        dataset_id="ds-parent",
        dataset_version="1.0",
        schema_version="1.0",
        board="CBSE",
        medium="English",
        language="en",
        owner="test-owner",
        actor="test",
        reason="init",
    )

    ko_parent = ko_service.register_object(
        package_id=parent_pkg.package_id,
        source_reference="ref-parent",
        lineage_reference="lineage-01",
    )
    assert ko_parent.knowledge_object_id

    # Test get()
    fetched = ko_service.get(ko_parent.knowledge_object_id)
    assert fetched.knowledge_object_id == ko_parent.knowledge_object_id

    # Test lineage
    lineage = ko_service.lineage(parent_pkg.package_id)
    assert lineage["knowledge_object_registered"] is True
    assert lineage["ancestors"] == []

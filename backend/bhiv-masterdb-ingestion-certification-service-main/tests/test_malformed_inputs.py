"""
Malformed Inputs and Error Handling Verification Suite.

Tests that invalid, missing, corrupted, and boundary payloads submitted to
critical backend endpoints (/validate, /certify, /packages/register, /admin/restore)
are safely intercepted and return controlled 4xx HTTP responses (400, 401, 403, 404, 422),
with 0 unhandled 500 server errors.
"""
import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture
def client() -> TestClient:
    return TestClient(main.app)


def _admin_headers():
    token, _ = main.auth_service.issue_token("TestAdmin", ["bhiv-admin"])
    return {"Authorization": f"Bearer {token}"}


def test_validate_malformed_payloads_return_4xx(client):
    """Assert empty or invalid payloads to /validate return 422 or 400."""
    # 1. Empty JSON object (missing required dataset_path)
    r1 = client.post("/validate", json={})
    assert r1.status_code == 422
    assert "detail" in r1.json()

    # 2. Type mismatch for dataset_path (expected string, given integer)
    r2 = client.post("/validate", json={"dataset_path": 12345})
    assert r2.status_code == 422

    # 3. Non-existent file path
    r3 = client.post(
        "/validate",
        json={"dataset_path": "/non/existent/path/never_found_xyz.csv", "dataset_id": "missing"},
    )
    assert r3.status_code in [400, 422]
    assert r3.status_code != 500


def test_certify_malformed_payloads_return_4xx(client):
    """Assert invalid certify requests return controlled 4xx."""
    # 1. Type mismatch on certify
    r1 = client.post("/certify", json={"dataset_id": {"nested": "not-a-string"}})
    assert r1.status_code == 422

    # 2. Non-existent dataset ID without dataset_path
    r2 = client.post("/certify", json={"dataset_id": "nonexistent_dataset_99999"})
    assert r2.status_code in [400, 404]
    assert r2.status_code != 500


def test_package_register_malformed_payloads_return_422(client):
    """Assert missing required fields to /packages/register return 422."""
    # 1. Completely empty payload
    r1 = client.post("/packages/register", json={})
    assert r1.status_code == 422

    # 2. Partial payload missing required fields (board, medium, owner)
    r2 = client.post(
        "/packages/register",
        json={"dataset_id": "partial_ds", "dataset_version": "1.0"},
    )
    assert r2.status_code == 422

    # 3. Invalid types in required fields
    r3 = client.post(
        "/packages/register",
        json={
            "dataset_id": "ds_bad",
            "dataset_version": 100,  # should be string
            "schema_version": "1.0",
            "board": "CBSE",
            "medium": "English",
            "language": "en",
            "owner": "test",
            "actor": "test",
            "reason": "testing",
        },
    )
    # Pydantic may coerce or validate, but must not crash with 500
    assert r3.status_code in [200, 422]


def test_admin_restore_malformed_inputs_handled(client):
    """Assert unauthorized, invalid, or corrupted payloads to /admin/restore return 4xx."""
    # 1. Missing Authorization header
    r1 = client.post("/admin/restore", json={"stores": {}})
    assert r1.status_code == 401

    # 2. Token without admin role
    user_token, _ = main.auth_service.issue_token("RegularUser", ["viewer"])
    r2 = client.post(
        "/admin/restore",
        json={"stores": {}},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r2.status_code == 403

    # 3. Malformed payload structure (stores is string instead of dict)
    r3 = client.post(
        "/admin/restore",
        json={"stores": "corrupted_string_instead_of_dict"},
        headers=_admin_headers(),
    )
    assert r3.status_code in [400, 422]
    assert r3.status_code != 500


def test_package_status_and_report_unknown_ids_return_404(client):
    """Assert non-existent IDs on query endpoints cleanly return 404."""
    r1 = client.get("/status/completely_unknown_id_xyz")
    assert r1.status_code == 404

    r2 = client.get("/report/completely_unknown_id_xyz")
    assert r2.status_code == 404

    r3 = client.get("/packages/completely_unknown_pkg_xyz")
    assert r3.status_code == 404

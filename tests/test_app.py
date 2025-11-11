import copy

from fastapi.testclient import TestClient

from src.app import app, activities


client = TestClient(app)


# Snapshot of initial activities so tests can restore state between tests
_BASELINE = copy.deepcopy(activities)


def setup_function(function):
    # Restore activities to baseline before each test
    activities.clear()
    activities.update(copy.deepcopy(_BASELINE))


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    # Should contain at least the baseline keys
    assert set(_BASELINE.keys()) == set(data.keys())


def test_signup_success():
    activity = "Chess Club"
    email = "tester1@mergington.edu"
    assert email not in activities[activity]["participants"]

    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")
    assert email in activities[activity]["participants"]


def test_signup_already_registered():
    activity = "Chess Club"
    email = "existing@mergington.edu"
    # ensure present
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 400


def test_signup_activity_not_found():
    resp = client.post("/activities/NoSuchActivity/signup?email=foo@bar.com")
    assert resp.status_code == 404


def test_unregister_success():
    activity = "Programming Class"
    email = "remove_me@mergington.edu"
    # ensure present
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    resp = client.delete(f"/activities/{activity}/unregister?email={email}")
    assert resp.status_code == 200
    body = resp.json()
    assert "Unregistered" in body.get("message", "")
    assert email not in activities[activity]["participants"]


def test_unregister_not_registered():
    activity = "Programming Class"
    email = "not-registered@mergington.edu"
    # ensure absent
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    resp = client.delete(f"/activities/{activity}/unregister?email={email}")
    assert resp.status_code == 400


def test_unregister_activity_not_found():
    resp = client.delete("/activities/NoSuchActivity/unregister?email=a@b.com")
    assert resp.status_code == 404

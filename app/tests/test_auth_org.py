def register_and_login(client, email="user@example.com", password="StrongPass123"):
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code == 200
    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    return login.json()


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def test_register_user(client):
    resp = client.post("/auth/register", json={"email": "test@example.com", "password": "StrongPass123"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"


def test_login_user_and_invalid_login(client):
    register_and_login(client)
    bad = client.post("/auth/login", json={"email": "user@example.com", "password": "wrong"})
    assert bad.status_code == 401


def test_create_organization_and_scope(client):
    tokens = register_and_login(client)
    create = client.post("/organizations", headers=auth_header(tokens["access_token"]), json={"name": "Acme"})
    assert create.status_code == 200
    org_id = create.json()["id"]
    lst = client.get("/organizations", headers=auth_header(tokens["access_token"]))
    assert any(o["id"] == org_id for o in lst.json())


def test_forbidden_access_for_non_member(client):
    t1 = register_and_login(client, "owner@example.com")
    org = client.post("/organizations", headers=auth_header(t1["access_token"]), json={"name": "Owner Org"}).json()
    t2 = register_and_login(client, "other@example.com")
    denied = client.get(f"/organizations/{org['id']}", headers=auth_header(t2['access_token']))
    assert denied.status_code == 403


def test_invite_accept_and_revoke_session(client):
    owner = register_and_login(client, "owner2@example.com")
    org = client.post("/organizations", headers=auth_header(owner['access_token']), json={"name": "Invite Org"}).json()
    role_list = client.get("/roles", headers=auth_header(owner['access_token'])).json()
    accountant = next(r for r in role_list if r["name"] == "accountant")
    invite = client.post(
        f"/organizations/{org['id']}/invite",
        headers=auth_header(owner['access_token']),
        json={"email": "newuser@example.com", "role_id": accountant["id"]},
    )
    assert invite.status_code == 200

    invited = register_and_login(client, "newuser@example.com")
    accepted = client.post("/invitations/accept", headers=auth_header(invited['access_token']), json={"token": invite.json()["token"]})
    assert accepted.status_code == 200

    sessions = client.get("/auth/sessions", headers=auth_header(invited['access_token'])).json()["sessions"]
    revoke = client.delete(f"/auth/sessions/{sessions[0]['id']}", headers=auth_header(invited['access_token']))
    assert revoke.status_code == 200

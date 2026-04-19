"""
PROMPT 117 — ClientFlow AI Python SDK
A lightweight API client for the ClientFlow AI REST API.

Installation:
    pip install requests
    # then copy this file or install when published to PyPI

Usage:
    from clientflow_sdk import ClientFlow

    cf = ClientFlow(base_url='https://api.clientflow.ai/api/v1')
    cf.auth.login('admin@acme.com', 'password', org_slug='acme')

    clients = cf.clients.list(status='active')
    for c in clients['clients']:
        print(c['name'])
"""

import hashlib
import json
from typing import Any, Dict, Optional
import urllib.request
import urllib.parse
import urllib.error


class ClientFlowError(Exception):
    """Raised when the API returns an error response."""
    def __init__(self, message: str, status: int, code: str = None, details: Any = None):
        super().__init__(message)
        self.status  = status
        self.code    = code
        self.details = details


class ClientFlowSDK:
    """
    ClientFlow AI API client.

    :param base_url: API base URL, e.g. 'https://api.clientflow.ai/api/v1'
    :param token:    Optional JWT token (can be set after login)
    :param timeout:  Request timeout in seconds (default: 30)
    """

    def __init__(
        self,
        base_url: str = "https://api.clientflow.ai/api/v1",
        token: Optional[str] = None,
        timeout: int = 30,
    ):
        self.base_url = base_url.rstrip("/")
        self.token    = token
        self.timeout  = timeout

        # Resource namespaces
        self.auth        = AuthResource(self)
        self.clients     = ClientsResource(self)
        self.broadcasts  = BroadcastsResource(self)
        self.payments    = PaymentsResource(self)
        self.analytics   = AnalyticsResource(self)
        self.ai          = AIResource(self)
        self.sessions    = SessionsResource(self)
        self.experiments = ExperimentsResource(self)
        self.branding    = BrandingResource(self)
        self.usage       = UsageResource(self)

    def set_token(self, token: str) -> None:
        """Set JWT token (called automatically after login)."""
        self.token = token

    def _request(
        self,
        method: str,
        path: str,
        body: Optional[Dict] = None,
        params: Optional[Dict] = None,
    ) -> Any:
        url = self.base_url + path
        if params:
            filtered = {k: v for k, v in params.items() if v is not None}
            if filtered:
                url += "?" + urllib.parse.urlencode(filtered)

        data = json.dumps(body).encode("utf-8") if body is not None else None

        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        req = urllib.request.Request(url, data=data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            raw = e.read()
            try:
                payload = json.loads(raw)
            except Exception:
                payload = {}
            raise ClientFlowError(
                message=payload.get("error", f"HTTP {e.code}"),
                status=e.code,
                code=payload.get("code"),
                details=payload.get("details"),
            ) from e
        except urllib.error.URLError as e:
            raise ClientFlowError(message=str(e.reason), status=0) from e

    def _get(self, path: str, params: Optional[Dict] = None) -> Any:
        return self._request("GET", path, params=params)

    def _post(self, path: str, body: Optional[Dict] = None) -> Any:
        return self._request("POST", path, body=body)

    def _put(self, path: str, body: Optional[Dict] = None) -> Any:
        return self._request("PUT", path, body=body)

    def _delete(self, path: str) -> Any:
        return self._request("DELETE", path)


# ─── Resources ────────────────────────────────────────────────────────────────

class AuthResource:
    def __init__(self, sdk: ClientFlowSDK):
        self._sdk = sdk

    def login(self, email: str, password: str, org_slug: Optional[str] = None) -> Dict:
        """Login and automatically set the token."""
        body: Dict = {"email": email, "password": password}
        if org_slug:
            body["orgSlug"] = org_slug
        data = self._sdk._post("/auth/login", body)
        if "token" in data:
            self._sdk.set_token(data["token"])
        return data

    def register_org(self, org_name: str, org_slug: str, email: str, password: str, name: str = None) -> Dict:
        return self._sdk._post("/auth/register-org", {
            "orgName": org_name, "orgSlug": org_slug,
            "email": email, "password": password, "name": name,
        })

    def me(self) -> Dict:
        return self._sdk._get("/auth/me")

    def logout(self) -> Dict:
        result = self._sdk._post("/auth/logout")
        self._sdk.token = None
        return result


class ClientsResource:
    def __init__(self, sdk: ClientFlowSDK):
        self._sdk = sdk

    def list(self, status: str = None, search: str = None, page: int = 1, limit: int = 50) -> Dict:
        return self._sdk._get("/clients", {"status": status, "search": search, "page": page, "limit": limit})

    def get(self, client_id: str) -> Dict:
        return self._sdk._get(f"/clients/{client_id}")

    def create(self, data: Dict) -> Dict:
        return self._sdk._post("/clients", data)

    def update(self, client_id: str, data: Dict) -> Dict:
        return self._sdk._put(f"/clients/{client_id}", data)

    def delete(self, client_id: str) -> Dict:
        return self._sdk._delete(f"/clients/{client_id}")


class BroadcastsResource:
    def __init__(self, sdk: ClientFlowSDK):
        self._sdk = sdk

    def list(self) -> Dict:
        return self._sdk._get("/broadcasts")

    def get(self, broadcast_id: str) -> Dict:
        return self._sdk._get(f"/broadcasts/{broadcast_id}")

    def create(self, data: Dict) -> Dict:
        return self._sdk._post("/broadcasts", data)

    def send(self, broadcast_id: str) -> Dict:
        return self._sdk._post(f"/broadcasts/{broadcast_id}/send")


class PaymentsResource:
    def __init__(self, sdk: ClientFlowSDK):
        self._sdk = sdk

    def list(self, status: str = None) -> Dict:
        return self._sdk._get("/payments", {"status": status})

    def get(self, payment_id: str) -> Dict:
        return self._sdk._get(f"/payments/{payment_id}")

    def create(self, data: Dict) -> Dict:
        return self._sdk._post("/payments", data)

    def confirm(self, payment_id: str) -> Dict:
        return self._sdk._post(f"/payments/{payment_id}/confirm")


class AnalyticsResource:
    def __init__(self, sdk: ClientFlowSDK):
        self._sdk = sdk

    def dashboard(self) -> Dict:
        return self._sdk._get("/analytics")

    def revenue(self) -> Dict:
        return self._sdk._get("/analytics/revenue")

    def ai_usage(self) -> Dict:
        return self._sdk._get("/analytics/ai")


class AIResource:
    def __init__(self, sdk: ClientFlowSDK):
        self._sdk = sdk

    def reply(self, client_id: str, message: str) -> Dict:
        return self._sdk._post("/ai/reply", {"clientId": client_id, "message": message})

    def suggest(self, client_id: str, context: str) -> Dict:
        return self._sdk._post("/ai/suggest", {"clientId": client_id, "context": context})


class SessionsResource:
    def __init__(self, sdk: ClientFlowSDK):
        self._sdk = sdk

    def list(self) -> Dict:
        return self._sdk._get("/sessions")

    def revoke(self, session_id: str) -> Dict:
        return self._sdk._delete(f"/sessions/{session_id}")

    def revoke_all(self) -> Dict:
        return self._sdk._delete("/sessions")


class ExperimentsResource:
    def __init__(self, sdk: ClientFlowSDK):
        self._sdk = sdk

    def list(self) -> Dict:
        return self._sdk._get("/experiments")

    def create(self, data: Dict) -> Dict:
        return self._sdk._post("/experiments", data)

    def start(self, experiment_id: str) -> Dict:
        return self._sdk._put(f"/experiments/{experiment_id}/start")

    def results(self, experiment_id: str) -> Dict:
        return self._sdk._get(f"/experiments/{experiment_id}/results")

    def set_winner(self, experiment_id: str, winner: str) -> Dict:
        return self._sdk._post(f"/experiments/{experiment_id}/winner", {"winner": winner})

    def record_conversion(self, experiment_id: str, client_id: str) -> Dict:
        return self._sdk._post(f"/experiments/{experiment_id}/convert", {"clientId": client_id})


class BrandingResource:
    def __init__(self, sdk: ClientFlowSDK):
        self._sdk = sdk

    def get(self) -> Dict:
        return self._sdk._get("/branding")

    def update(self, data: Dict) -> Dict:
        return self._sdk._put("/branding", data)

    def init_domain(self, domain: str) -> Dict:
        return self._sdk._post("/domains/initiate", {"domain": domain})

    def verify_domain(self) -> Dict:
        return self._sdk._post("/domains/verify")

    def get_domain(self) -> Dict:
        return self._sdk._get("/domains")


class UsageResource:
    def __init__(self, sdk: ClientFlowSDK):
        self._sdk = sdk

    def monthly(self) -> Dict:
        return self._sdk._get("/usage/monthly")

    def top_features(self) -> Dict:
        return self._sdk._get("/usage/top-features")


# ─── Convenience alias ────────────────────────────────────────────────────────
ClientFlow = ClientFlowSDK


# ─── Example usage ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    cf = ClientFlow(base_url="http://localhost:5000/api/v1")

    # Login
    auth_data = cf.auth.login("admin@acme.com", "secret123", org_slug="acme")
    print("Logged in as:", auth_data.get("email"))

    # List clients
    result = cf.clients.list(status="active", limit=10)
    print("Active clients:", len(result.get("clients", [])))

    # Analytics
    stats = cf.analytics.dashboard()
    print("Dashboard stats:", stats)

    # Logout
    cf.auth.logout()
    print("Logged out")

import unittest
from types import SimpleNamespace

from property_manager.security.shared_auth_adapter import AuthIdentity, SharedAuthAdapter


class AuthIdentityTests(unittest.TestCase):
    def test_scope_level_is_returned(self):
        identity = AuthIdentity("manager", "token", 0, 1, {"propertymanager": 5})
        self.assertEqual(identity.level_for("propertymanager"), 5)

    def test_missing_scope_has_no_access(self):
        identity = AuthIdentity("viewer", "token", 0, 1, {"another-app": 10})
        self.assertEqual(identity.level_for("propertymanager"), 0)

    def test_global_administrator_has_full_access(self):
        identity = AuthIdentity("admin", "token", 0, 99, {})
        self.assertEqual(identity.level_for("propertymanager"), 99)


class SharedAuthAdapterTests(unittest.TestCase):
    def make_adapter(self):
        adapter = SharedAuthAdapter.__new__(SharedAuthAdapter)
        adapter.scope = "propertymanager"
        user = SimpleNamespace(
            username="manager",
            global_level=1,
            collections={"propertymanager": 5},
        )
        adapter._request_class = lambda **values: SimpleNamespace(**values)
        adapter._service = SimpleNamespace(
            login=lambda request: SimpleNamespace(
                success=True,
                token="issued-token",
                remember=request.remember,
                error=None,
                user=user,
            ),
            authenticate=lambda username, token: SimpleNamespace(
                success=True,
                token=token,
                remember=0,
                error=None,
                user=SimpleNamespace(
                    username=username,
                    global_level=1,
                    collections={"propertymanager": 5},
                ),
            ),
        )
        adapter._backend = SimpleNamespace(
            _ClearToken=lambda username: ("Success", "User has been logged out")
        )
        return adapter

    def test_login_preserves_shared_auth_token_and_permissions(self):
        identity = self.make_adapter().login("manager", "secret", True)
        self.assertEqual(identity.token, "issued-token")
        self.assertEqual(identity.remember, 1)
        self.assertEqual(identity.level_for("propertymanager"), 5)

    def test_authenticate_validates_each_request_without_rotating_token(self):
        identity = self.make_adapter().authenticate("manager", "existing-token")
        self.assertEqual(identity.token, "existing-token")
        self.assertEqual(identity.username, "manager")

    def test_logout_clears_the_shared_auth_token(self):
        self.make_adapter().logout("manager")


if __name__ == "__main__":
    unittest.main()

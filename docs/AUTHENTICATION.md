# SharedAuth Integration

Baseline 6.7 delegates authentication and authorization to the existing
SharedAuth installation. PropertyManager does not maintain passwords or user
accounts in MariaDB.

## Runtime contract

1. `POST /api/v1/auth/login` accepts a username, password, and remember flag.
2. SharedAuth verifies the password and issues its existing single active token.
3. The browser stores the username and token in session storage, or local
   storage when **Remember me** is selected.
4. Every subsequent API request sends `X-PM-Username` and `X-PM-Token`.
5. Flask middleware calls SharedAuth `authenticate(username, token)` before
   allowing the request.
6. `GET`, `HEAD`, and `OPTIONS` require the configured read level. Mutating
   requests require the configured write level.
7. Logout clears the token in SharedAuth and clears browser storage.

The middleware deliberately uses the non-rotating `authenticate()` method.
This validates each transaction while avoiding races between concurrent API
requests that would occur if every request rotated the one active token.

## Permission defaults

```text
Scope:       propertymanager
Read level:  1
Write level: 5
Admin:       global level 99
```

All values except global administrator level are configurable in `backend/.env`.

## Files used from the supplied `login` directory

PropertyManager loads the existing installation at runtime through
`PM_AUTH_PATH`. No SharedAuth source file is copied into PropertyManager.

Directly loaded at runtime:

- `login/mongoclass.py` — existing MongoDB user store, Argon2/bcrypt password
  verification, token creation, expiry, remember-me behavior, and logout.
- `login/shared_auth/__init__.py` — SharedAuth package exports.
- `login/shared_auth/models.py` — authentication request, result, and user models.
- `login/shared_auth/service.py` — login, token validation, logout, and permission workflow.
- `login/shared_auth/backend.py` — protocol describing the legacy authentication backend.

Used as dependency guidance:

- `login/requirements.txt` — its `argon2-cffi`, `bcrypt`, and `pymongo`
  dependencies are also declared by PropertyManager.

Reviewed to preserve the established request pattern:

- `login/login.py`, including its compatibility methods and the documented
  non-rotating `authenticate()` path intended for PropertyManager middleware.
- Python scripts under `src/py/`, especially `reconcile.py`,
  `initConfig_rqst.py`, `entry_rqst.py`, and `delete_entries.py`.
- `comfiles/common.js` and `login/login.js`, which demonstrate attaching the
  username/token to requests and storing remember-me sessions.

Not copied or used by PropertyManager:

- SharedAuth HTML, CSS, and browser JavaScript pages. PropertyManager provides
  a Bootstrap 5 login view suitable for its existing single-page application.
- User creation, activation, password-reset, mail, and administration scripts.
  Those workflows remain hosted by the existing SharedAuth installation.

## Configuration

```ini
PM_AUTH_PATH=/absolute/path/to/mtlapts_wkspc/login
PM_AUTH_DATABASE=auth
PM_AUTH_SCOPE=propertymanager
PM_AUTH_READ_LEVEL=1
PM_AUTH_WRITE_LEVEL=5
```

`PM_AUTH_PATH` must be an absolute server-side path containing
`mongoclass.py` and `shared_auth/`. It is never exposed to the browser.

PropertyManager loads the reusable service directly instead of importing
`login.py`. This avoids importing the legacy CGI entry-point dependency on
Python versions where the standard-library `cgi` module has been removed.

## Creating access

Register or infer the `propertymanager` scope in the existing SharedAuth
administration interface, then assign the appropriate numeric level to each
user. Users without the scope cannot sign into PropertyManager. Global level
99 accounts retain administrative access.

## Security notes

- Use HTTPS in production because the compatibility token is a bearer credential.
- Do not log the password, token, or authentication request headers.
- Do not expose MongoDB directly to browsers or PropertyManager's frontend.
- MariaDB remains the PropertyManager data authority; MongoDB is used only by
  SharedAuth for identities, permissions, and tokens.

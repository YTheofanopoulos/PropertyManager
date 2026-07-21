import { escapeHtml } from "../shared/format";
import { authService } from "../../services/authService";

export function renderLoginPage(onAuthenticated: () => Promise<void>): void {
  const app = document.getElementById("app");
  if (!app) throw new Error("Application root not found");
  app.innerHTML = `
    <main class="login-page">
      <section class="card login-card" aria-labelledby="login-title">
        <div class="card-body p-4 p-md-5">
          <div class="text-center mb-4">
            <div class="login-icon"><i class="fa-solid fa-building"></i></div>
            <h1 id="login-title" class="h3 mt-3 mb-1">PropertyManager</h1>
            <p class="text-body-secondary mb-0">Sign in with your existing account.</p>
          </div>
          <div id="login-message" class="d-none" role="alert"></div>
          <form id="property-manager-login">
            <div class="mb-3">
              <label class="form-label" for="login-username">Username</label>
              <input class="form-control" id="login-username" autocomplete="username" required autofocus>
            </div>
            <div class="mb-3">
              <label class="form-label" for="login-password">Password</label>
              <input class="form-control" id="login-password" type="password" autocomplete="current-password" required>
            </div>
            <div class="form-check mb-4">
              <input class="form-check-input" id="login-remember" type="checkbox">
              <label class="form-check-label" for="login-remember">Remember me on this device</label>
            </div>
            <button class="btn btn-primary w-100" id="login-submit" type="submit">Sign In</button>
          </form>
        </div>
      </section>
    </main>`;

  const form = document.getElementById("property-manager-login") as HTMLFormElement;
  const button = document.getElementById("login-submit") as HTMLButtonElement;
  const message = document.getElementById("login-message")!;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.className = "d-none";
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing In…';
    try {
      await authService.login(
        (document.getElementById("login-username") as HTMLInputElement).value.trim(),
        (document.getElementById("login-password") as HTMLInputElement).value,
        (document.getElementById("login-remember") as HTMLInputElement).checked,
      );
      await onAuthenticated();
    } catch (error) {
      message.className = "alert alert-danger";
      message.innerHTML = escapeHtml((error as Error).message || "Sign-in failed.");
      button.disabled = false;
      button.textContent = "Sign In";
    }
  });
}

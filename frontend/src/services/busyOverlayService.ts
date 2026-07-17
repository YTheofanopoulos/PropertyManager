class BusyOverlayService {
  private depth = 0;

  show(message = "Working…", detail = "Please wait."): void {
    this.depth += 1;

    let overlay = document.getElementById("application-busy-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "application-busy-overlay";
      overlay.className = "application-busy-overlay";
      overlay.setAttribute("role", "status");
      overlay.setAttribute("aria-live", "polite");
      overlay.setAttribute("aria-busy", "true");
      overlay.innerHTML = `
        <div class="application-busy-panel">
          <div class="spinner-border text-primary" aria-hidden="true"></div>
          <div>
            <div id="application-busy-message" class="fw-semibold"></div>
            <div id="application-busy-detail"
                 class="small text-body-secondary mt-1"></div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    this.update(message, detail);
    document.body.classList.add("application-is-busy");
    overlay.classList.add("show");
  }

  update(message: string, detail?: string): void {
    const messageElement = document.getElementById(
      "application-busy-message",
    );
    const detailElement = document.getElementById(
      "application-busy-detail",
    );

    if (messageElement) messageElement.textContent = message;
    if (detailElement && detail !== undefined) {
      detailElement.textContent = detail;
    }
  }

  hide(): void {
    this.depth = Math.max(0, this.depth - 1);
    if (this.depth > 0) return;

    const overlay = document.getElementById("application-busy-overlay");
    overlay?.classList.remove("show");
    document.body.classList.remove("application-is-busy");
  }

  forceHide(): void {
    this.depth = 0;
    const overlay = document.getElementById("application-busy-overlay");
    overlay?.classList.remove("show");
    document.body.classList.remove("application-is-busy");
  }
}

export const busyOverlay = new BusyOverlayService();

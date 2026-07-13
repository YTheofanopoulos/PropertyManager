
import { Modal, Toast } from "bootstrap";

export function modal(id: string): Modal {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Modal '${id}' was not found.`);
  }
  return Modal.getOrCreateInstance(element);
}

export function notify(
  message: string,
  tone: "success" | "danger" | "info" = "success",
): void {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="toast align-items-center text-bg-${tone} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">${escapeHtml(message)}</div>
        <button class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  const element = wrapper.firstElementChild as HTMLElement;
  container.appendChild(element);
  element.addEventListener("hidden.bs.toast", () => element.remove());
  Toast.getOrCreateInstance(element, { delay: 3200 }).show();
}

export function escapeHtml(value: string): string {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

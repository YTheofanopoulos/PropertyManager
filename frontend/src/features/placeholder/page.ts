export function renderPlaceholder(
  container: HTMLElement,
  title: string,
  description: string,
): void {
  container.innerHTML = `
    <div class="page-heading">
      <h1>${title}</h1>
      <p class="text-body-secondary mb-0">${description}</p>
    </div>

    <div class="card">
      <div class="card-body py-5 text-center">
        <i class="fa-solid fa-screwdriver-wrench fs-1 text-primary mb-3"></i>
        <h2 class="h4">${title}</h2>
        <p class="text-body-secondary mb-0">
          This section is part of the approved application navigation and will
          be implemented in a later Milestone 4 increment.
        </p>
      </div>
    </div>
  `;
}

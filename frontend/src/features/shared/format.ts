export function currency(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function escapeHtml(value: string): string {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

import DataTable from "datatables.net-bs5";

export function createTable(selector: string, options: Record<string, unknown> = {}): DataTable.Api {
  return new DataTable(selector, {
    pageLength: 10,
    lengthMenu: [10, 25, 50],
    layout: {
      topStart: "pageLength",
      topEnd: "search",
      bottomStart: "info",
      bottomEnd: "paging",
    },
    stateSave: true,
    language: {
      search: "",
      searchPlaceholder: "Search records...",
      lengthMenu: "Show _MENU_ entries",
    },
    ...options,
  });
}

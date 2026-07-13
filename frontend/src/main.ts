import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css";
import "./styles/app.css";
import "bootstrap";

import { route } from "./app/router";
import { renderShell } from "./app/shell";

const container = renderShell();
window.addEventListener("hashchange", () => route(container));
route(container);

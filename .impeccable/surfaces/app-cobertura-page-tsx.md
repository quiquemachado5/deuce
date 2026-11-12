---
version: 1
slug: "app-cobertura-page-tsx"
primary_target: "app/cobertura/page.tsx"
related_targets: ["app/cobertura/Operations.tsx","app/cobertura/Reconciliation.tsx"]
---

Cobertura is a public Read surface. Separate ATP and WTA cards show each circuit’s year range, match count and latest result date, with category year ranges in a collapsed disclosure. The publication journal shows the latest three recorded days by the date entries were added to the archive. Older days open on demand. The journal sits beside its introduction on desktop and below it on mobile. The review note gives the pending count when the last historical review matches the published archive version and has unresolved results. A disclosure explains draw completeness and when detailed statistics are available. The publication date closes the page. Operational data, evidence queues and version records belong to the internal review workflow. Existing DEUCE typography and rounded surfaces use `var(--bg-raised)` and `var(--bg-sunken)`. The route fits the viewport without horizontal page overflow.

Los rangos por categoría viven dentro de cada tarjeta de circuito. Se abren de forma independiente para no repetir la clasificación ni estirar la tarjeta vecina.

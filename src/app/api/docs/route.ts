// Renders the OpenAPI spec with Swagger UI from a pinned CDN build (no npm dependency).
const SWAGGER_VERSION = "5.17.14";

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>RunX API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css" />
</head>
<body>
<div id="swagger"></div>
<script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js" crossorigin></script>
<script>window.ui = SwaggerUIBundle({ url: "/api/openapi", dom_id: "#swagger" });</script>
</body>
</html>`;

export function GET() {
  return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } });
}

import { getCurrentUser } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import { redirect } from "next/navigation";

export default async function ApiDocsPage() {
  const user = await getCurrentUser();
  if (!user || !(ADMIN_ROLES as readonly string[]).includes(user.role)) {
    redirect("/owner/login?next=/admin/api-docs");
  }

  return (
    <div className="swagger-page">
      <SwaggerUI />
    </div>
  );
}

function SwaggerUI() {
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kaifbook API — Swagger</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .scheme-container { background: #fff; box-shadow: none; padding: 16px 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs/openapi',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      defaultModelsExpandDepth: 1,
      docExpansion: 'list',
      filter: true,
      withCredentials: true,
    });
  </script>
</body>
</html>`;

  return (
    <iframe
      srcDoc={html}
      style={{
        width: "100%",
        height: "100vh",
        border: "none",
        display: "block",
      }}
      title="Swagger UI"
    />
  );
}

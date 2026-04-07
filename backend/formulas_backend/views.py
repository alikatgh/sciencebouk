from django.conf import settings
from django.http import HttpResponse


def backend_home(_: object) -> HttpResponse:
    frontend_url = getattr(settings, "FRONTEND_URL", "http://127.0.0.1:5173")
    frontend_label = frontend_url.replace("https://", "").replace("http://", "")
    return HttpResponse(
        f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Sciencebouk API</title>
  <style>
    * { box-sizing: border-box; margin: 0; }
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .sub { color: #64748b; font-size: 14px; margin-bottom: 20px; }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .card h3 { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .ep { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 14px; }
    .method { font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .get { background: #dcfce7; color: #166534; }
    .post { background: #dbeafe; color: #1e40af; }
    .patch { background: #fef3c7; color: #92400e; }
    code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-size: 13px; }
    .cta { display: inline-block; margin-top: 16px; padding: 10px 20px; background: #1e293b; color: white; border-radius: 8px; font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Sciencebouk API Server</h1>
  <p class="sub">Backend is running. The frontend app is at <a href="{frontend_url}">{frontend_label}</a></p>

  <div class="grid">
    <div class="card">
      <h3>Equations</h3>
      <div class="ep"><span class="method get">GET</span> <a href="/api/equations/">/api/equations/</a></div>
      <div class="ep"><span class="method get">GET</span> <a href="/api/equations/1/">/api/equations/1/</a></div>
      <div class="ep"><span class="method get">GET</span> <a href="/api/search/?q=newton">/api/search/?q=newton</a></div>
      <div class="ep"><span class="method patch">PATCH</span> <code>/api/equations/{id}/progress/</code></div>
    </div>

    <div class="card">
      <h3>Courses</h3>
      <div class="ep"><span class="method get">GET</span> <a href="/api/courses/equations-that-changed-the-world/">/api/courses/{slug}/</a></div>
      <div class="ep"><span class="method get">GET</span> <a href="/api/courses/equation-atlas/">/api/courses/equation-atlas/</a> <span style="color:#94a3b8;font-size:12px">legacy</span></div>
    </div>

    <div class="card">
      <h3>Auth (JWT)</h3>
      <div class="ep"><span class="method post">POST</span> <code>/api/auth/register/</code></div>
      <div class="ep"><span class="method post">POST</span> <code>/api/auth/login/</code></div>
      <div class="ep"><span class="method post">POST</span> <code>/api/auth/refresh/</code></div>
      <div class="ep"><span class="method get">GET</span> <code>/api/auth/me/</code></div>
      <div class="ep"><span class="method patch">PATCH</span> <code>/api/auth/me/profile/</code></div>
    </div>

    <div class="card">
      <h3>Payments (Stripe)</h3>
      <div class="ep"><span class="method post">POST</span> <code>/api/payments/checkout/</code></div>
      <div class="ep"><span class="method post">POST</span> <code>/api/payments/portal/</code></div>
      <div class="ep"><span class="method get">GET</span> <code>/api/payments/status/</code></div>
      <div class="ep"><span class="method post">POST</span> <code>/api/payments/webhook/</code></div>
    </div>

    <div class="card">
      <h3>Health & Admin</h3>
      <div class="ep"><span class="method get">GET</span> <a href="/api/health/">/api/health/</a></div>
      <div class="ep"><span class="method get">GET</span> <a href="/admin/">/admin/</a></div>
    </div>
  </div>

  <a class="cta" href="{frontend_url}">Open the app &rarr;</a>
</body>
</html>"""
    )

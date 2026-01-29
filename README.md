# MJOLNIR

A self-hosted personal site with a **cyber lab × Halo-inspired** aesthetic.

Static-first (plain HTML/CSS/JS) for low overhead and a small attack surface, deployed behind Nginx.

## Pages

- **Home**: `index.html`
- **About**: `about.html`
- **Projects**: `projects.html` (renders from `/projects.json` when present)
- **Telemetry**: `telemetry.html` (reads from `/telemetry.json`)
- **NelsonWeb wrapper**: `nelsonweb.html` (iframe wrapper for a separate app served under `/nelsonweb/`)
- **Uplink Cache**: `uplink-cache.html` (two-way file portal)

## Uplink Cache (Two-Way File Portal)

Uplink Cache provides a simple two-way workflow:

- **DROPS (outgoing)**: files generated for you and placed under `/drops/`.
- **INBOX (incoming)**: files you upload for the assistant to retrieve.

### Inbox Uploads (Button-Based)

This repo includes the **front-end** upload form. In production, you enable uploads by running a small upload service and proxying it behind Nginx.

**Flow:**
1. Visit `uplink-cache.html`
2. Click **UPLOAD TO INBOX**
3. Authenticate (Basic Auth)
4. File is uploaded to the server’s inbox and indexed.

### Server-side components (recommended)

- Inbox directory:
  - `/var/www/mjolnir/inbox/`
  - and an index file `/var/www/mjolnir/inbox/index.json`

- Upload service (example implementation used on the VPS):
  - Listens on `127.0.0.1:3010`
  - Accepts `POST /upload` (multipart field name: `file`)
  - Writes uploaded files into `/var/www/mjolnir/inbox/`
  - Regenerates `/var/www/mjolnir/inbox/index.json`

- Nginx proxy (example snippet):

```nginx
# Password-protect inbox reads
location ^~ /inbox/ {
  auth_basic "MJOLNIR Uplink Cache";
  auth_basic_user_file /etc/nginx/.htpasswd-mjolnir;

  index index.html;
  add_header Cache-Control "no-store" always;
  try_files $uri $uri/ =404;
}

# Upload API (behind same auth)
location = /upload {
  auth_basic "MJOLNIR Uplink Cache";
  auth_basic_user_file /etc/nginx/.htpasswd-mjolnir;

  proxy_pass http://127.0.0.1:3010/upload;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Local Preview

From the repo root:

```bash
python3 -m http.server 8080
```

Open:
- http://localhost:8080/

Note: Uploads require server-side components and will not function on a simple static server.

## Deployment (Nginx)

Copy the site to a web root:

```bash
sudo mkdir -p /var/www/mjolnir
sudo rsync -av --delete ./ /var/www/mjolnir/
sudo chown -R www-data:www-data /var/www/mjolnir
```

An example server config is included in:
- `nginx-mjolnir.conf`

## License

Personal project (update as desired).

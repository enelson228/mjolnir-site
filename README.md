# MJOLNIR (static site)

Cyber lab × Halo-inspired aesthetic.

## Files
- `index.html` — Home
- `about.html` — About / dossier
- `styles.css` — Theme
- `script.js` — Starfield + clock

## Local preview
From the `mjolnir-site/` folder:

```bash
python3 -m http.server 8080
```
Then open: `http://localhost:8080`

## VPS hosting (Nginx)
1) Copy the folder to something like:

```bash
sudo mkdir -p /var/www/mjolnir
sudo rsync -av --delete ./mjolnir-site/ /var/www/mjolnir/
```

2) Nginx server block (example):

```nginx
server {
  listen 80;
  server_name your-domain.com;

  root /var/www/mjolnir;
  index index.html;

  location / {
    try_files $uri $uri/ =404;
  }
}
```

3) Reload Nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Optional: add HTTPS via certbot.

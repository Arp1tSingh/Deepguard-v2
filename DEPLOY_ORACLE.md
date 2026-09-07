# Deploying DeepGuard backend on Oracle Cloud (Always Free VPS)

Target end state: FastAPI backend running 24/7 in Docker on an Always Free
Ubuntu VM, reachable at `https://deepguard-arpit.duckdns.org`, consumed by
the Vercel-hosted frontend (`NEXT_PUBLIC_DEEPGUARD_API_URL`).

Prerequisites on your machine: an SSH client, `scp`, the 3 `.pth` weights in
`D:\Deepgaurd\weights`, and this repo cloned locally with the deploy files
committed (`Dockerfile`, `docker-compose.yml`, `.env.example` at repo root).

---

## 1. Provision the free-tier VM

1. Sign in to Oracle Cloud (cloud.oracle.com) and create a tenancy if needed.
2. Launch an instance with:
   - **Image:** Ubuntu (latest LTS available).
   - **Shape:** an **Always Free** shape (e.g. `VM.Standard.A1.Flex` ARM —
     4 CPU / 24 GB RAM free allowance — or `VM.Standard.E2.1.Micro`).
   - **Networking:** keep the default VCN/subnet; note the instance's
     **public IP** from the instance details page.
3. When prompted, **generate a new SSH key pair** and download the private
   key (`*.key`), or paste your existing public key. Save it somewhere safe
   (e.g. `C:\Users\<you>\.ssh\oracle.key`).
4. SSH in to confirm access (Ubuntu images use user `ubuntu`):
   `ssh -i <key> ubuntu@<PUBLIC_IP>`.

## 2. Open ports 80 and 443 (OS firewall AND Oracle network layer)

Oracle blocks traffic at the **cloud network layer by default**, even if the
OS firewall allows it. You must open ports in **both** places — this is the
single most common "why can't I reach my VPS" mistake on Oracle Cloud.

**a) OS firewall (on the VM):**

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8000/tcp   # for the pre-HTTPS connectivity check in step 6
sudo ufw enable
sudo ufw status
```

(If `ufw` is inactive/absent and `iptables` is used instead, add equivalent
ACCEPT rules for 22/80/443/8000.)

**b) Oracle Cloud Security List / Network Security Group (in the console):**

1. Instance details → Virtual cloud network → Security lists → Default
   Security List (or the NSG attached to the instance).
2. Add **Ingress Rules**: source `0.0.0.0/0`, TCP, destination ports
   `80`, `443` (and `8000` temporarily for step 6 — remove it after HTTPS
   works). Repeat for IPv6 (`::/0`) if the subnet has IPv6.

## 3. Install Docker + compose plugin on the VM

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu   # log out/in after this
docker compose version           # should print a version, not an error
```

Also confirm Docker restarts on boot (needed for step 8):

```bash
sudo systemctl enable docker
sudo systemctl is-enabled docker
```

## 4. Copy the weight files to the VPS

From your **local** machine (PowerShell), copy the 3 checkpoints into the
directory `docker-compose.yml` bind-mounts:

```powershell
scp -i C:\Users\<you>\.ssh\oracle.key D:\Deepgaurd\weights\*.pth ubuntu@<PUBLIC_IP>:/home/ubuntu/deepguard/weights/
```

Create the target dir first if needed (`ssh ... mkdir -p ~/deepguard/weights`).
Expected on the VM afterwards:

```
/home/ubuntu/deepguard/weights/
├── ucf_best.pth
├── spsl_best.pth
└── xception_best.pth
```

## 5. Clone the repo and create `.env`

On the VM:

```bash
cd ~
git clone https://github.com/Arp1tSingh/Deepguard-v2.git deepguard
cd deepguard
cp .env.example .env
nano .env
```

Set for initial testing (permissive; tightened in step 9):

```
ALLOW_ORIGINS=*
WEIGHTS_DIR=/weights
REQUIRE_WEIGHTS=1
```

## 6. Build, run, and verify on the public IP (HTTP first)

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend   # watch for "Application startup complete"
```

Confirm the API responds **before** adding HTTPS:

```bash
curl http://localhost:8000/api/health        # on the VM → {"status":"ok"}
curl http://<PUBLIC_IP>:8000/api/health      # from your machine
```

If the container exits immediately, check `docker compose logs backend` —
with `REQUIRE_WEIGHTS=1` a missing/misplaced `.pth` fails fast with a clear
`Missing model checkpoints` error (fix step 4 paths and restart).

## 7. HTTPS via DuckDNS (no owned domain) + nginx + certbot

Once `http://<PUBLIC_IP>:8000/api/health` works from your machine:

**a) Create the subdomain.** Go to duckdns.org, sign in (GitHub/Google login
works), create a subdomain (e.g. `deepguard-arpit`) and point it at the VM's
public IP in the DuckDNS web UI.

**b) Confirm DNS propagation BEFORE certbot** — Let's Encrypt will fail
otherwise:

```bash
nslookup deepguard-arpit.duckdns.org
```

It must return the VM's public IP. If not, wait a few minutes and retry.

**c) Install nginx as a reverse proxy** (port 80/443 → localhost:8000),
with `server_name deepguard-arpit.duckdns.org`:

```bash
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/deepguard
```

```nginx
server {
    listen 80;
    server_name deepguard-arpit.duckdns.org;

    client_max_body_size 500M;   # allow video uploads through the proxy

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s; # analysis is CPU-bound and slow
        proxy_send_timeout 600s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/deepguard /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**d) Get the certificate with certbot** (auto-configures nginx for HTTPS):

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d deepguard-arpit.duckdns.org
```

Verify: `https://deepguard-arpit.duckdns.org/api/health` → `{"status":"ok"}`.
You can now close port 8000 in both firewalls (step 2) — all traffic goes
through 443.

**e) DuckDNS record maintenance.** Free DuckDNS subdomains don't expire, but
if the VM's public IP ever changes (e.g. instance recreated), update the
record in the DuckDNS web UI to match. Optionally, install DuckDNS's
cron-based auto-update script on the VM so the record stays in sync
automatically (see duckdns.org "install" instructions).

**This is the backend URL to use going forward:**

- Vercel frontend: `NEXT_PUBLIC_DEEPGUARD_API_URL=https://deepguard-arpit.duckdns.org`
  (set in the Vercel project settings, then redeploy — it's baked at build time).
- `ALLOW_ORIGINS` tightening in step 9.

## 8. Survive reboots without manual intervention

Two layers (both needed):

1. **Container restarts** — already handled: `restart: unless-stopped` in
   `docker-compose.yml`.
2. **Docker daemon starts on boot** — handled in step 3
   (`systemctl enable docker`). Verify end-to-end once: `sudo reboot`, wait
   ~2 minutes, then `curl https://deepguard-arpit.duckdns.org/api/health`.

## 9. Tighten ALLOW_ORIGINS last

Once everything above is confirmed working through the Vercel frontend:

1. On the VM, set `ALLOW_ORIGINS=https://<your-vercel-app>.vercel.app` in
   `~/deepguard/.env` (exact frontend origin, no trailing slash).
2. `docker compose up -d` (recreates the container with the new env).
3. Re-run the full flow from the live frontend: upload → verdict →
   evidence → export. Any `Failed to fetch`/CORS error in the browser
   console at this point means the origin string doesn't exactly match —
   fix the string, don't reopen CORS.

**Pattern to remember:** start permissive for connectivity testing, tighten
last — same as the original HF Spaces plan.

# Appendix D: Cloudflare Tunnel — Production Config

> Split backend docs (Appendix D).

## D.1 Named tunnel with config file (recommended)

Quick tunnels (`--url`) are for dev. For production, use a named tunnel with a config file
so it survives reboots and binds to a stable hostname.

```bash
# 1. Install cloudflared (already in section 14.3)

# 2. Login to Cloudflare (one-time, opens browser)
cloudflared tunnel login

# 3. Create a named tunnel
cloudflared tunnel create pi-manager
# Outputs: Created tunnel pi-manager with id <TUNNEL_ID>

# 4. Route DNS: bind a subdomain to the tunnel
cloudflared tunnel route dns pi-manager pi.example.com
# This creates a CNAME record: pi.example.com → <TUNNEL_ID>.cfargotunnel.com
```

## D.2 Config file: ~/.cloudflared/config.yml

```yaml
tunnel: <TUNNEL_ID> # from step 3 above
credentials-file: /home/pi/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: pi.example.com
    service: http://localhost:3001
  - service: http_status:404 # catch-all for unknown hostnames
```

## D.3 Run with config

```bash
# Manual run (uses config.yml automatically)
cloudflared tunnel run pi-manager

# Or specify config explicitly
cloudflared tunnel --config /home/pi/.cloudflared/config.yml run pi-manager
```

## D.4 systemd service (production)

```ini
# /etc/systemd/system/pi-manager-tunnel.service
[Unit]
Description=Pi Manager Cloudflare Tunnel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/pi/.cloudflared/config.yml run pi-manager
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable pi-manager-tunnel
sudo systemctl start pi-manager-tunnel
```

## D.5 WebSocket support

Cloudflare Tunnel natively supports WebSocket. No special config needed.
Socket.IO will connect over WSS (`wss://pi.example.com/socket.io/`) automatically
because the tunnel provides TLS termination.


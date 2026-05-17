#!/bin/bash
# Setup HTTPS with Let's Encrypt / certbot
# Run on the Ubuntu server (124.220.17.38)
#
# IMPORTANT: Let's Encrypt requires a domain name, not a bare IP address.
# If you only have an IP, see the self-signed certificate section at the bottom.

set -e

DOMAIN="${1:-124.220.17.38}"

echo "=== Installing certbot ==="
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

echo ""
echo "=== Creating webroot directory for certbot ==="
sudo mkdir -p /var/www/certbot

echo ""
echo "=== Method 1: If you have a domain name ==="
echo "Run: sudo certbot certonly --webroot -w /var/www/certbot -d YOUR_DOMAIN"
echo ""
echo "=== Method 2: Self-signed certificate (for IP-only setup) ==="
echo "Running self-signed certificate generation for $DOMAIN..."

# Generate self-signed certificate
sudo mkdir -p /etc/letsencrypt/live/$DOMAIN
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
  -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
  -subj "/CN=$DOMAIN/O=Token-Leaderboard/C=US"

echo ""
echo "=== Updating nginx configuration ==="
# Copy the HTTPS-enabled nginx config
sudo cp nginx.conf /etc/nginx/sites-available/token-leaderboard
sudo ln -sf /etc/nginx/sites-available/token-leaderboard /etc/nginx/sites-enabled/

# Test and reload nginx
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=== HTTPS setup complete! ==="
echo "Server: https://$DOMAIN"
echo ""
echo "Note: Self-signed certificates will show a browser warning."
echo "To get a trusted certificate, point a domain name to this server and run:"
echo "  sudo certbot certonly --webroot -w /var/www/certbot -d YOUR_DOMAIN"
echo "  sudo systemctl reload nginx"

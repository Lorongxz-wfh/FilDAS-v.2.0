#!/bin/bash
set -e

cd /var/www/html

echo "=== Clearing config ==="
php artisan config:clear

echo "=== Caching config ==="
php artisan config:cache

echo "=== Storage link ==="
php artisan storage:link --force || true

echo "=== Running migrate:fresh --seed ==="
php artisan migrate:fresh --force --seed

echo "=== Migration done, starting server ==="
exec /start.sh

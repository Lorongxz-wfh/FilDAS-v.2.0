#!/bin/bash

cd /var/www/html

php artisan config:clear
php artisan config:cache
php artisan storage:link --force || true
php artisan migrate:fresh --force --seed

exec /start.sh

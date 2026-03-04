FROM richarvey/nginx-php-fpm:3.1.6

WORKDIR /var/www/html

# Copy app
COPY . .

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Laravel required writable dirs
RUN chown -R nginx:nginx /var/www/html/storage /var/www/html/bootstrap/cache

# Nginx config (we will add nginx.conf next step)
COPY nginx.conf /etc/nginx/sites-available/default.conf

# Run custom boot tasks via the base image's hook directory (exec'd by /start.sh)
COPY deploy.sh /etc/my_init.d/99-deploy.sh
RUN chmod +x /etc/my_init.d/99-deploy.sh

EXPOSE 80
# Important: keep base image default CMD/entrypoint so it starts php-fpm + nginx

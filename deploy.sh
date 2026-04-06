#!/bin/bash
cd /var/www/docker-instances/Fretes
echo "Atualizando codigo..."
git pull origin main
echo "Buildando..."
docker compose build --no-cache
docker compose up -d
sleep 5
docker compose cp web:/app/staticfiles/. /var/www/docker-instances/Fretes/staticfiles/
echo "Deploy concluido."

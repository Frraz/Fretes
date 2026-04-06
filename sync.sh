#!/bin/bash
cd /var/www/docker-instances/Fretes
echo "Sincronizando dados da planilha..."
docker compose exec web python manage.py importar_planilha
echo "Pronto."

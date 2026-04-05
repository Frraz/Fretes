# 🚛 Painel de Fretes — Ferzion

Sistema web para controle e visualização de fretes, abastecimentos e adiantamentos.
Django + PostgreSQL + Docker.

---

## 🖥️ Setup Local (Windows)

### Pré-requisitos
- Docker Desktop instalado e rodando

### Passo a passo

```powershell
# 1. Abra o terminal no VSCode na pasta do projeto
cd C:\Users\warle\Desktop\Projetos\fretes

# 2. Edite o .env e confirme o caminho da planilha
# EXCEL_FOLDER deve apontar para a pasta da planilha

# 3. Suba os containers
docker compose up --build

# 4. Acesse no navegador
# http://localhost:8000
```

O sistema automaticamente:
- Cria o banco PostgreSQL
- Roda as migrations
- Importa os dados da planilha
- Inicia o servidor

### Reimportar dados após editar a planilha

```powershell
docker compose exec web python manage.py importar_planilha
```

---

## 🌐 Deploy na VPS (fretes.ferzion.com.br)

### 1. Prepare a VPS

```bash
# Instale Docker
curl -fsSL https://get.docker.com | sh

# Clone o repositório
git clone https://github.com/SEU_USUARIO/fretes.git
cd fretes

# Copie e edite o .env de produção
cp .env.production .env
nano .env
# Configure: senha do banco, chave secreta, caminho da planilha
```

### 2. Suba com perfil de produção (inclui Nginx)

```bash
docker compose --profile production up -d --build
```

### 3. Configure o DNS

Crie um registro A no seu domínio:
```
fretes.ferzion.com.br → IP_DA_SUA_VPS
```

### 4. HTTPS com Certbot (opcional mas recomendado)

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d fretes.ferzion.com.br
# Depois configure o SSL no nginx/default.conf
```

---

## 📊 Funcionalidades

### Painel Geral
- KPIs: Romaneios, Abastecimentos, Adiantamentos, Saldo Líquido
- Distribuição: A Receber / Devedor / Quitado
- Gráfico de barras: saldo por motorista
- Alertas de devedores (saldo < -R$ 5.000)
- Tabela completa com busca

### Detalhe do Motorista
- Clique em qualquer motorista para ver o extrato
- Mostra TODOS os romaneios, abastecimentos e adiantamentos que compõem o saldo
- Apenas status EM ABERTO e LANÇADO (FECHADO = já pago)

### Colheita / Talhões
- Sacas colhidas por talhão (peso líquido ÷ 60)
- Peso total, viagens, valor de frete por talhão
- Gráfico visual de sacas

### Romaneios (com filtros)
- Filtro por Talhão, Status, Origem
- Busca por motorista, placa, NF
- Sacas calculadas automaticamente

### Filtro por Grupo
- Consolidado (SF + SJ)
- Sagrada Família (SF)
- São José (SJ)

---

## 📡 API

| Endpoint | Descrição |
|----------|-----------|
| GET /api/kpis/?grupo=ALL | KPIs gerais |
| GET /api/resumo/?grupo=SF | Resumo por motorista |
| GET /api/motorista/ID/ | Detalhe com extrato |
| GET /api/colheita/?grupo=ALL | Sacas por talhão |
| GET /api/romaneios/ | Lista de romaneios |
| GET /api/abastecimentos/ | Lista de abastecimentos |
| GET /api/adiantamentos/ | Lista de adiantamentos |
| GET /api/filtros/ | Listas para filtros |

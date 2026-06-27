#!/bin/sh
set -e

# CRON_SECRET é obrigatório (mesmo valor configurado nos serviços workers/ads-engine)
if [ -z "$CRON_SECRET" ]; then
  echo "[cron] ERRO: CRON_SECRET não definido" >&2
  exit 1
fi

# Hosts internos dos serviços alvo (padrão EasyPanel <projeto>_<servico>).
# Sobrescreva via env se o projeto/serviço tiver outro nome.
WORKERS_URL="${WORKERS_URL:-http://prospeccao-cnpj_lotta-workers:3005}"
ADS_URL="${ADS_URL:-http://prospeccao-cnpj_lotta-ads-engine:3006}"

# busybox cron NÃO propaga a env do container para os jobs, então injetamos os
# valores direto no crontab a partir do template.
sed \
  -e "s|\$WORKERS_URL|${WORKERS_URL}|g" \
  -e "s|\$ADS_URL|${ADS_URL}|g" \
  -e "s|\$CRON_SECRET|${CRON_SECRET}|g" \
  /etc/crontabs/root.tpl > /etc/crontabs/root

echo "[cron] alvos: WORKERS_URL=${WORKERS_URL} ADS_URL=${ADS_URL}"
echo "[cron] agendamento carregado:"
grep -vE '^\s*#|^\s*$' /etc/crontabs/root | sed 's/secret=[^"&]*/secret=***/'

# -f foreground, -l 8 nível de log
exec crond -f -l 8

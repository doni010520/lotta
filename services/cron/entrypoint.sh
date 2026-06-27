#!/bin/sh
set -e

# CRON_SECRET é obrigatório (mesmo valor configurado nos serviços workers/ads-engine)
if [ -z "$CRON_SECRET" ]; then
  echo "[cron] ERRO: CRON_SECRET não definido" >&2
  exit 1
fi

# busybox cron NÃO propaga a env do container para os jobs, então injetamos o
# secret direto no crontab a partir do template.
sed "s|\$CRON_SECRET|${CRON_SECRET}|g" /etc/crontabs/root.tpl > /etc/crontabs/root

echo "[cron] agendamento carregado:"
grep -vE '^\s*#|^\s*$' /etc/crontabs/root | sed 's/secret=[^"&]*/secret=***/'

# -f foreground, -l 8 nível de log
exec crond -f -l 8

# Sidecar de cron: chama os endpoints /cron/* dos serviços internos.
# Não expõe porta nem domínio — roda só dentro da rede do projeto no EasyPanel.
# Build context = raiz do repositório (padrão do EasyPanel p/ Dockerfile).
FROM alpine:3.20

RUN apk add --no-cache curl

COPY services/cron/crontab /etc/crontabs/root.tpl
COPY services/cron/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

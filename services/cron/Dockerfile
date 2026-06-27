# Sidecar de cron: chama os endpoints /cron/* dos serviços internos.
# Não expõe porta nem domínio — roda só dentro da rede do projeto no EasyPanel.
FROM alpine:3.20

RUN apk add --no-cache curl

COPY crontab /etc/crontabs/root.tpl
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

# lotta-cron

Sidecar que dispara os endpoints `/cron/*` dos serviços internos (workers e ads-engine)
nos horários certos. Não expõe porta nem domínio — fala só pela rede interna do EasyPanel.

## Como subir no EasyPanel

1. **Project `lotta` → Create Service → App**.
2. **Source**: o mesmo repositório Git do projeto (`doni010520/lotta`), branch `master`.
3. **Build**:
   - Build method: **Dockerfile**
   - **Build context**: `services/cron`
   - **Dockerfile path**: `Dockerfile` (relativo ao context acima)
4. **Environment**:
   - `CRON_SECRET` com **o mesmo valor** usado nos serviços `lotta-workers` e `lotta-ads-engine`.
   - (opcional) `WORKERS_URL` e `ADS_URL` se o projeto/serviço tiver outro nome.
     Default: `http://prospeccao-cnpj_lotta-workers:3005` e `http://prospeccao-cnpj_lotta-ads-engine:3006`.
5. **NÃO** configure domínio nem porta (é um worker, não recebe tráfego).
6. **Deploy**.

Confira os logs: deve aparecer `[cron] agendamento carregado:` com a lista de jobs
(o secret aparece mascarado como `***`).

## Ajustes

- Hosts internos seguem o padrão `<projeto>_<servico>` — aqui o projeto é `prospeccao-cnpj`,
  então `prospeccao-cnpj_lotta-workers:3005` e `prospeccao-cnpj_lotta-ads-engine:3006`.
  Ajuste via env `WORKERS_URL` / `ADS_URL`.
- Frequências: edite o `crontab` (sintaxe padrão cron — veja https://crontab.guru).

To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

open http://localhost:3000

## Observability (Grafana + Postgres logs)

Start Grafana:
```sh
docker compose -f docker-compose.observability.yml up -d
```

Open:
```txt
http://localhost:3001
```

Default credentials:
```txt
admin / admin
```

The dashboard `Postgres Logs Overview` is provisioned automatically and reads from:
- PostgreSQL (`logs`) via datasource `Postgres Logs (Railway)`

Important: application logs are persisted into PostgreSQL `logs` when `DATABASE_URL` is set.
SQLite/Turso local replica is no longer used as the log persistence backend.

Manual sync cloud -> local replica (non-log data, if needed):
```sh
bun run sync:turso
```

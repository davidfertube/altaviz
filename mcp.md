# Altaviz MCP Configuration

Model Context Protocol (MCP) servers extend Claude Code with direct access to project infrastructure. Configuration lives in `.mcp.json` at the project root.

## Prerequisites

- Node.js 18+ (`npx` must be available in PATH)
- Docker running with PostgreSQL container (`docker-compose up -d`)

## Configured Servers

### postgres (via @bytebase/dbhub)

Direct database access for schema inspection, query execution, and data validation. Replaces manual `psql` commands.

**Connection**: `postgresql://postgres:postgres@localhost:5432/compressor_health`
(matches PostgreSQL defaults in `config/database.yaml`)

**Note**: This MCP server connects to the local PostgreSQL instance. For Azure SQL Database, use Azure Data Studio or `sqlcmd` CLI directly. The ETL pipeline's `database_writer.py` handles both backends via the `DB_TYPE` environment variable.

**Capabilities**:
- `execute_sql` — run read/write queries against PostgreSQL
- `list_tables` — enumerate all tables and views
- `describe_table` — inspect column types, constraints, indexes

**Common usage patterns**:
- Verify ETL populated data: `SELECT COUNT(*) FROM sensor_readings_agg GROUP BY window_type`
- Check fleet health: `SELECT * FROM v_fleet_health_summary ORDER BY compressor_id`
- Inspect active alerts: `SELECT * FROM v_active_alerts`
- Validate schema after migrations: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sensor_readings_agg'`
- Check data quality metrics: `SELECT * FROM data_quality_metrics ORDER BY metric_timestamp DESC LIMIT 10`

**Why dbhub over @modelcontextprotocol/server-postgres**: The official MCP postgres server was deprecated (July 2025) with unpatched SQL injection vulnerabilities. `@bytebase/dbhub` is actively maintained with built-in safety controls.

### filesystem (@modelcontextprotocol/server-filesystem)

Structured access to `data/` and `config/` directories. Critical because `data/` is gitignored — agents cannot see these files through normal file tools.

**Allowed paths**:
- `/Users/david/Downloads/repos/altaviz/data` — raw Parquet files, Delta Lake tables
- `/Users/david/Downloads/repos/altaviz/config` — YAML configuration files

**Capabilities**:
- `read_file` — read file contents
- `write_file` — write file contents
- `list_directory` — list directory contents
- `search_files` — search by pattern
- `get_file_info` — file metadata (size, modified date)

**Common usage patterns**:
- Verify simulator output: list files in `data/raw/`
- Check Delta Lake tables exist: list `data/processed/delta/sensors_gold/`
- Inspect Parquet file sizes after ETL runs
- Read YAML configs without shell commands

## Servers Considered but Not Included

| Server | Reason excluded |
|--------|----------------|
| `sequential-thinking` | Claude Code has built-in reasoning; adds context overhead without clear benefit |
| `memory` | CLAUDE.md serves as persistent context; memory servers are for multi-agent/multi-contributor workflows |
| `brave-search` | Not needed for an offline MLOps pipeline project |

## Adding a New MCP Server

**Via CLI**:
```bash
claude mcp add --transport stdio --scope project <server-name> -- <command> [args]
```

**Manually**: Add an entry to `.mcp.json` under `mcpServers`:
```json
{
  "mcpServers": {
    "new-server": {
      "command": "npx",
      "args": ["-y", "@scope/package-name", "--arg1", "value"]
    }
  }
}
```

After adding, document the server's purpose and usage patterns in this file.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| postgres "Connection refused" | Run `docker-compose up -d` and wait for healthy status |
| "npx not found" | Install Node.js 18+: `brew install node` |
| Server not appearing | Run `/mcp` in Claude Code to check status |
| Permission prompts on every use | Approve with "always allow" or add to `.claude/settings.local.json` |
| Reset stuck approvals | Run `claude mcp reset-project-choices` |

# Azure SQL Database Setup Guide (Free Tier)

Step-by-step guide to set up Azure SQL Database for Altaviz using Azure's free tier.

---

## What You Get for Free

| Azure Service | Free Tier | Duration | Good For |
|--------------|-----------|----------|----------|
| **Azure SQL Database** | 100,000 vCore seconds/month, 32 GB storage | 12 months | sensor_readings_agg, alerts, quality metrics |
| **Azure Blob Storage** | 5 GB LRS, 20,000 read/10,000 write operations | 12 months | Delta Lake Bronze/Silver/Gold tables |
| **Azure Key Vault** | 10,000 operations/month | 12 months | Storing database credentials securely |
| **Free Azure Account** | $200 credit | 30 days | Experimenting with premium services |

**Total cost after free tier: ~$5-15/month** for Altaviz workload (if you stay within limits).

---

## Prerequisites

1. Microsoft account (outlook.com, hotmail.com, or any email)
2. Credit card (required for signup, NOT charged during free tier)
3. Azure CLI installed locally

---

## Step 1: Create Azure Account

1. Go to https://azure.microsoft.com/free/
2. Click "Start free"
3. Sign in with Microsoft account
4. Enter credit card (verification only, not charged)
5. Complete identity verification

**You now have:**
- $200 free credit (expires in 30 days)
- 12 months of free services (including SQL Database)

---

## Step 2: Install Azure CLI

```bash
# macOS
brew install azure-cli

# Verify installation
az --version

# Login to Azure
az login
```

This opens a browser window. Sign in with your Azure account.

---

## Step 3: Create Resource Group

A resource group is a container for all your Azure resources.

```bash
# Create resource group in South Central US (closest to Texas operations)
az group create \
    --name altaviz-rg \
    --location southcentralus
```

**Why South Central US?** It's the Azure region closest to Texas, where Archrock's compressor stations are located. Lower latency for data ingestion.

---

## Step 4: Create Azure SQL Server

```bash
# Create SQL Server (the hosting instance)
az sql server create \
    --name altaviz-server \
    --resource-group altaviz-rg \
    --location southcentralus \
    --admin-user altaviz_admin \
    --admin-password "<YOUR_STRONG_PASSWORD>"
```

**Important:** Replace `<YOUR_STRONG_PASSWORD>` with a strong password (12+ chars, uppercase, lowercase, numbers, special chars).

**Save these credentials -- you'll need them for `.env`.**

---

## Step 5: Create Azure SQL Database (Free Tier)

```bash
# Create database using free tier
az sql db create \
    --resource-group altaviz-rg \
    --server altaviz-server \
    --name compressor_health \
    --edition GeneralPurpose \
    --compute-model Serverless \
    --family Gen5 \
    --capacity 1 \
    --min-capacity 0.5 \
    --auto-pause-delay 60 \
    --max-size 32GB \
    --free-limit \
    --free-limit-exhaustion-behavior AutoPause
```

**Key settings explained:**
- `--free-limit`: Enables free tier (100,000 vCore seconds/month)
- `--compute-model Serverless`: Auto-scales up/down (saves cost)
- `--auto-pause-delay 60`: Pauses after 60 minutes of inactivity (saves cost)
- `--min-capacity 0.5`: Minimum 0.5 vCores when active
- `--free-limit-exhaustion-behavior AutoPause`: Auto-pauses when free limit reached

---

## Step 6: Configure Firewall Rules

```bash
# Allow your current IP address
az sql server firewall-rule create \
    --resource-group altaviz-rg \
    --server altaviz-server \
    --name AllowMyIP \
    --start-ip-address $(curl -s ifconfig.me) \
    --end-ip-address $(curl -s ifconfig.me)

# Allow Azure services to access (for Fabric/Synapse)
az sql server firewall-rule create \
    --resource-group altaviz-rg \
    --server altaviz-server \
    --name AllowAzureServices \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0
```

---

## Step 7: Create Database Schema

```bash
# Install sqlcmd (Azure SQL command line tool)
# macOS:
brew install sqlcmd

# Connect and run the Azure SQL schema
sqlcmd \
    -S altaviz-server.database.windows.net \
    -d compressor_health \
    -U altaviz_admin \
    -P "<YOUR_PASSWORD>" \
    -i infrastructure/sql/schema_azure_sql.sql

# Run seed data
sqlcmd \
    -S altaviz-server.database.windows.net \
    -d compressor_health \
    -U altaviz_admin \
    -P "<YOUR_PASSWORD>" \
    -i infrastructure/sql/seed_data_azure_sql.sql
```

**Verify tables were created:**
```bash
sqlcmd \
    -S altaviz-server.database.windows.net \
    -d compressor_health \
    -U altaviz_admin \
    -P "<YOUR_PASSWORD>" \
    -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';"
```

Expected output:
```
TABLE_NAME
---------------------------
station_locations
compressor_metadata
sensor_readings_agg
maintenance_events
alert_history
data_quality_metrics
ml_predictions

(7 rows affected)
```

---

## Step 8: Download JDBC Driver for PySpark

PySpark needs the Microsoft JDBC driver to connect to Azure SQL.

```bash
# Create jars directory in project
mkdir -p jars/

# Download Microsoft JDBC Driver for SQL Server
curl -L "https://go.microsoft.com/fwlink/?linkid=2266159" -o /tmp/mssql-jdbc.tar.gz
tar -xzf /tmp/mssql-jdbc.tar.gz -C /tmp/
cp /tmp/sqljdbc_12.4/enu/jars/mssql-jdbc-12.4.2.jre11.jar jars/

# Verify
ls -la jars/mssql-jdbc-*.jar
```

---

## Step 9: Configure Altaviz for Azure SQL

### Update `.env` file:

```bash
# Create or update .env file
cat > .env << 'EOF'
# Database Type: 'postgresql' or 'azure_sql'
DB_TYPE=azure_sql

# Azure SQL Database settings
AZURE_SQL_SERVER=altaviz-server.database.windows.net
AZURE_SQL_DATABASE=compressor_health
AZURE_SQL_USER=altaviz_admin
AZURE_SQL_PASSWORD=<YOUR_PASSWORD>
AZURE_SQL_PORT=1433

# Keep PostgreSQL settings for local fallback
DB_HOST=localhost
DB_PORT=5432
DB_NAME=compressor_health
DB_USER=postgres
DB_PASSWORD=postgres

# Logging
LOG_LEVEL=INFO
EOF
```

---

## Step 10: Run the ETL Pipeline with Azure SQL

```bash
# Generate test data (if not already done)
python src/data_simulator/compressor_simulator.py

# Run ETL pipeline (will use Azure SQL based on DB_TYPE=azure_sql in .env)
python src/etl/pyspark_pipeline.py --jars jars/mssql-jdbc-12.4.2.jre11.jar
```

**Or run with explicit Spark config:**
```bash
spark-submit \
    --jars jars/mssql-jdbc-12.4.2.jre11.jar \
    src/etl/pyspark_pipeline.py
```

---

## Step 11: Verify Data in Azure SQL

```bash
# Check row counts
sqlcmd \
    -S altaviz-server.database.windows.net \
    -d compressor_health \
    -U altaviz_admin \
    -P "<YOUR_PASSWORD>" \
    -Q "
        SELECT 'sensor_readings_agg' as tbl, COUNT(*) as rows FROM sensor_readings_agg
        UNION ALL
        SELECT 'alert_history', COUNT(*) FROM alert_history
        UNION ALL
        SELECT 'station_locations', COUNT(*) FROM station_locations;
    "
```

Expected output:
```
tbl                    rows
---------------------- ----
sensor_readings_agg    1008
alert_history          45
station_locations      4
```

---

## Switching Between PostgreSQL and Azure SQL

### Use PostgreSQL (local development):
```bash
# In .env:
DB_TYPE=postgresql

# Start local PostgreSQL
docker-compose up -d

# Run pipeline
python src/etl/pyspark_pipeline.py
```

### Use Azure SQL (cloud):
```bash
# In .env:
DB_TYPE=azure_sql

# Run pipeline (with JDBC driver)
python src/etl/pyspark_pipeline.py --jars jars/mssql-jdbc-12.4.2.jre11.jar
```

**The same PySpark ETL code runs against both databases without modification.**

---

## Cost Management Tips

### Stay Within Free Tier:

1. **Auto-pause is your friend**: Database pauses after 60 min of inactivity (costs $0 while paused)
2. **Monitor usage**: Check Azure Portal > SQL Database > Compute utilization
3. **Free tier limit**: 100,000 vCore seconds = ~27.8 hours of active compute per month
4. **Altaviz usage**: Running the ETL pipeline takes ~2 minutes per run. You can run it 800+ times/month for free

### If You Exceed Free Tier:

- Database auto-pauses (not deleted)
- Resume next month when free tier resets
- Or pay ~$5/month for serverless compute (only when active)

### Monitor Spending:

```bash
# Check current cost
az consumption usage list \
    --query "[?contains(instanceName, 'altaviz')].{Resource:instanceName, Cost:pretaxCost}" \
    --output table

# Set spending alert
az monitor metrics alert create \
    --name "altaviz-cost-alert" \
    --resource-group altaviz-rg \
    --condition "total cost > 10" \
    --description "Alert when Altaviz costs exceed $10"
```

---

## Cleanup (When Done Learning)

To avoid any charges after the free tier expires:

```bash
# Delete everything in one command
az group delete --name altaviz-rg --yes --no-wait
```

This deletes the resource group and ALL resources inside it (SQL server, database, etc.).

---

## Troubleshooting

### "Cannot connect to server"
- Check firewall rules: `az sql server firewall-rule list --resource-group altaviz-rg --server altaviz-server`
- Your IP may have changed: re-run the firewall rule creation step

### "Database is paused"
- First connection after pause takes 30-60 seconds to "wake up"
- This is normal for serverless tier

### "JDBC driver not found"
- Ensure `mssql-jdbc-12.4.2.jre11.jar` is in the `jars/` directory
- Pass it to PySpark: `--jars jars/mssql-jdbc-12.4.2.jre11.jar`

### "Login failed"
- Verify credentials in `.env` match what you set in Step 4
- Check that `AZURE_SQL_USER` includes just the username (not `username@servername`)

---

## What to Say to Kunal About This

> "I deployed Altaviz to Azure SQL Database on the free tier to learn the Azure ecosystem hands-on. The same PySpark ETL pipeline runs against both local PostgreSQL and Azure SQL without code changes -- I just switch the DB_TYPE environment variable. The database writer module auto-detects the configured backend and constructs the appropriate JDBC URL. I also converted the PostgreSQL schema to T-SQL, handling the syntax differences like IDENTITY columns, filtered indexes instead of partial indexes, and ROW_NUMBER instead of DISTINCT ON for the views."

---

*Guide created for Altaviz MLOps platform - David Fernandez*

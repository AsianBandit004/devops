
---

# Project 2 — Azure Log Analytics Pipeline (Event Hub → ADLS → Synapse → Visualization)

**Goal:** Build a cloud-native log processing pipeline using Azure services. Ingest logs via Event Hub, store in ADLS Gen2, parse with Synapse Serverless SQL, and visualize with Synapse Studio or free tools.
**Budget:** Keep under **\$30/month** (can run nearly free if Event Hub is deleted when idle).

**Prereqs:**

* Azure subscription with permissions to create resource groups + services
* Azure CLI installed
* Sample log file (e.g., `new-sample.log`) for testing

---

## Steps

### Resource group

```bash
az group create -n rg-log-demo -l eastus
```

---

### App Service (dummy log generator, optional)

```bash
az appservice plan create -g rg-log-demo -n asp-free --sku F1
az webapp create -g rg-log-demo -p asp-free -n logdemoapp$RANDOM --runtime "DOTNETCORE:6.0"
```

---

### Event Hub (mailbox for logs)

```bash
az eventhubs namespace create -g rg-log-demo -n logdemo-ns --sku Basic -l eastus
az eventhubs eventhub create -g rg-log-demo --namespace-name logdemo-ns -n logdemo-hub
```

⚠️ Basic = **1 day retention**, \~\$22/month even if idle. Delete if not in use.

---

### ADLS Gen2 Storage (raw + curated logs)

```bash
az storage account create \
  -n logdemonstorage$RANDOM \
  -g rg-log-demo \
  -l eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --hierarchical-namespace true
```

Create containers:

```bash
az storage container create --account-name logdemonstorage6339 --name raw-logs
az storage container create --account-name logdemonstorage6339 --name curated-logs
```

---

### Upload sample log

Example contents:

```
192.168.1.10 - - [30/Aug/2025:19:01:01 +0000] "GET /index.html HTTP/1.1" 200 1024 "-" "Mozilla/5.0"
192.168.1.11 - - [30/Aug/2025:19:02:15 +0000] "GET /products.html HTTP/1.1" 200 2048 "http://example.com" "Chrome/120.0"
192.168.1.12 - - [30/Aug/2025:19:03:44 +0000] "POST /login HTTP/1.1" 302 512 "http://example.com/login" "Edge/118.0"
```

Upload:

```bash
az storage blob upload \
  --account-name logdemonstorage6339 \
  --container-name raw-logs \
  --name new-sample.log \
  --file ./new-sample.log \
  --overwrite
```

---

### Synapse Workspace (serverless SQL)

```bash
az synapse workspace create \
  --name logdemosynapse \
  --resource-group rg-log-demo \
  --storage-account logdemonstorage6339 \
  --file-system raw-logs \
  --sql-admin-login-user sqladmin \
  --sql-admin-login-password <StrongPassword123!> \
  --location eastus
```

Portal config:

* Allow **client IP** + **Azure services** in firewall
* Storage account IAM → give Synapse **Storage Blob Data Reader/Contributor**

---

### Query raw logs

```sql
SELECT TOP 10 *
FROM OPENROWSET(
  BULK 'https://logdemonstorage6339.blob.core.windows.net/raw-logs/new-sample.log',
  FORMAT='CSV',
  FIELDTERMINATOR='0x0b',
  FIELDQUOTE='0x0b',
  ROWTERMINATOR='0x0a'
)
WITH (log_line VARCHAR(8000)) AS rows;
```

---

### Parse logs into fields

```sql
WITH parsed AS (
  SELECT
    CASE WHEN CHARINDEX(' ', log_line)>1
         THEN SUBSTRING(log_line,1,CHARINDEX(' ',log_line)-1) END AS ip,
    CASE WHEN CHARINDEX('[', log_line)>0
         THEN SUBSTRING(log_line,CHARINDEX('[',log_line)+1,20) END AS ts_raw,
    CASE WHEN CHARINDEX('"', log_line)>0
         THEN SUBSTRING(log_line,CHARINDEX('"',log_line)+2,3) END AS method,
    CASE WHEN CHARINDEX('"', log_line)>0
         THEN SUBSTRING(log_line,
                        CHARINDEX(' ',log_line,CHARINDEX('"',log_line)+2)+1,
                        CHARINDEX(' ',log_line,CHARINDEX(' ',log_line,CHARINDEX('"',log_line)+2)+1) -
                        (CHARINDEX(' ',log_line,CHARINDEX('"',log_line)+2)+1)) END AS url,
    CASE WHEN CHARINDEX('"', log_line)>0
         THEN SUBSTRING(log_line,LEN(log_line)-2,3) END AS status
  FROM OPENROWSET(
          BULK 'https://logdemonstorage6339.blob.core.windows.net/raw-logs/new-sample.log',
          FORMAT='CSV',
          FIELDTERMINATOR='0x0b',
          FIELDQUOTE='0x0b',
          ROWTERMINATOR='0x0a'
       )
       WITH (log_line VARCHAR(8000)) AS r
)
SELECT TOP 20 * FROM parsed;
```

---

### Save parsed results to Parquet (curated logs)

```sql
CREATE DATABASE weblogs;
USE weblogs;

CREATE DATABASE SCOPED CREDENTIAL mi_cred WITH IDENTITY='Managed Identity';

CREATE EXTERNAL DATA SOURCE logs_dsrc
WITH (LOCATION='https://logdemonstorage6339.blob.core.windows.net', CREDENTIAL=mi_cred);

CREATE EXTERNAL FILE FORMAT ParquetFmt WITH (FORMAT_TYPE=PARQUET);

CREATE EXTERNAL TABLE dbo.web_logs_parsed
WITH (
  LOCATION='curated-logs/weblogs/',
  DATA_SOURCE=logs_dsrc,
  FILE_FORMAT=ParquetFmt
)
AS
SELECT * FROM parsed;
```

---

### Visualize

Free options (no Power BI required):

* **Synapse Studio** → query results grid → chart
* **Azure Data Studio** → connect to Synapse endpoint → chart
* **Jupyter Notebook** → query Synapse with `pyodbc` + `matplotlib`

Example aggregation query:

```sql
SELECT url, status, COUNT(*) AS hits
FROM dbo.web_logs_parsed
GROUP BY url, status
ORDER BY hits DESC;
```

---

### Cleanup

```bash
az group delete -n rg-log-demo --yes --no-wait
```

---

### Cost notes

* App Service (F1) → free
* Event Hub Basic → \~\$22/month (delete if idle)
* ADLS Gen2 → pennies per GB
* Synapse serverless → pay-per-query (pennies for MBs)
* All tracked inside `rg-log-demo` with cost alerts

---

✅ Done!

---



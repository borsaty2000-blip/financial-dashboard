import os
import re
from typing import Any

_READ_ONLY = re.compile(r"^\s*(select|with|show|describe|explain)\b", re.IGNORECASE)


def query_databricks(query: str) -> dict[str, Any]:
    if not _READ_ONLY.match(query):
        raise ValueError("Only read-only Databricks queries are allowed")
    hostname = os.environ.get("DATABRICKS_SERVER_HOSTNAME")
    http_path = os.environ.get("DATABRICKS_HTTP_PATH")
    token = os.environ.get("DATABRICKS_TOKEN")
    if not hostname or not http_path or not token:
        raise RuntimeError("DATABRICKS_SERVER_HOSTNAME, DATABRICKS_HTTP_PATH and DATABRICKS_TOKEN are required")
    from databricks import sql

    with sql.connect(server_hostname=hostname, http_path=http_path, access_token=token) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            columns = [description[0] for description in cursor.description or []]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    return {"columns": columns, "rows": rows, "row_count": len(rows)}

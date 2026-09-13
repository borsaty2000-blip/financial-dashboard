from services.databricks import query_databricks

try:
    query_databricks("DELETE FROM prices")
except ValueError:
    print("readonly_guard_ok")
else:
    raise AssertionError("non-read-only query must be rejected")

try:
    query_databricks("SELECT 1")
except RuntimeError:
    print("missing_credentials_guard_ok")
else:
    raise AssertionError("missing credentials must be reported")

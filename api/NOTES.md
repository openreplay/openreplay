#### psycopg3 API

I mis-remember the psycopg v2 vs. v3 API.

For the record, the expected psycopg3's async api looks like the
following pseudo code:

```python
    async with orpy.get().database.connection() as cnx:
         async with cnx.transaction():
             row = await cnx.execute("SELECT EXISTS(SELECT 1 FROM public.tenants)")
             row = await row.fetchone()
             return row["exists"]
```

Minding the following:

- Where `orpy.get().database` is the postgresql connection pooler.
- Wrap explicit transaction with `async with cnx.transaction():
  foobar()`
- Most of the time the transaction object is not used;
- Do execute await operation against `cnx`;
- `await cnx.execute` returns a cursor object;
- Do the `await cursor.fetchqux...` calls against the object return by
  a call to execute.

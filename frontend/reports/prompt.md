I want you to open foss.openreplay.com and run setJWT("<redacted JWT — userId 49, tenantId -1, iss OpenReplay-oss>") in console to log in, from there I want you to inspect network requests that run when you open https://foss.openreplay.com/65/sessions , then make a table of how request - time taken - bytes transferred", then find these requests on backend and frontend and trace following:
1. do we use all returned data in frontend or some fields are unused?
2. could the request process be optimized on api (golang, python) level?
3. could the SQL schema of the request itself be optimized?

Compile a report and put it into frontend/REPORT.md

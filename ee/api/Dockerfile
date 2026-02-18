FROM public.ecr.aws/p1t3u8a3/chalice:v1.22.12-ee
WORKDIR /app

COPY chalicelib/core/metadata.py chalicelib/core/metadata.py
COPY chalicelib/core/usability_testing/schema.py chalicelib/core/usability_testing/schema.py
COPY chalicelib/core/usability_testing/service.py chalicelib/core/usability_testing/service.py
COPY routers/core.py routers/core.py
COPY schemas/schemas.py schemas/schemas.py
COPY routers/ee.py routers/ee.py
COPY schemas/assist_stats_schema.py schemas/assist_stats_schema.py


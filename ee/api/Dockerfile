FROM public.ecr.aws/p1t3u8a3/chalice:v1.20.19-ee

COPY chalicelib/core/metadata.py /app/chalicelib/core/metadata.py
COPY chalicelib/core/usability_testing/schema.py /app/chalicelib/core/usability_testing/schema.py
COPY chalicelib/core/usability_testing/service.py /app/chalicelib/core/usability_testing/service.py
COPY routers/core.py /app/routers/core.py
COPY routers/ee.py /app/routers/ee.py
COPY schemas/assist_stats_schema.py /app/schemas/assist_stats_schema.py
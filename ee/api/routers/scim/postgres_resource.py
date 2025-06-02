from dataclasses import dataclass
from typing import Callable
from scim2_models import Resource


@dataclass
class PostgresResource:
    query_resources: Callable[[int], list[dict]]
    get_resource: Callable[[str, int], dict | None]
    create_resource: Callable[[int, Resource], dict]
    search_existing: Callable[[int, Resource], dict | None]
    restore_resource: Callable[[int, Resource], dict] | None
    delete_resource: Callable[[str, int], None]
    update_resource: Callable[[int, Resource], dict]

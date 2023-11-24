import logging
from chalicelib.utils import helper, pg_client


class DatabaseRequestHandler:
    def __init__(self, table_name):
        self.table_name = table_name
        self.constraints = []
        self.params = {}
        self.order_clause = ""
        self.sort_clause = ""
        self.select_columns = []
        self.sub_queries = []
        self.joins = []
        self.group_by_clause = ""
        self.client = pg_client
        self.logger = logging.getLogger(__name__)
        self.pagination = {}

    def add_constraint(self, constraint, param=None):
        self.constraints.append(constraint)
        if param:
            self.params.update(param)

    def add_subquery(self, subquery, alias, param=None):
        self.sub_queries.append((subquery, alias))
        if param:
            self.params.update(param)

    def add_join(self, join_clause):
        self.joins.append(join_clause)

    def add_param(self, key, value):
        self.params[key] = value

    def set_order_by(self, order_by):
        self.order_clause = order_by

    def set_sort_by(self, sort_by):
        self.sort_clause = sort_by

    def set_select_columns(self, columns):
        self.select_columns = columns

    def set_group_by(self, group_by_clause):
        self.group_by_clause = group_by_clause

    def set_pagination(self, page, page_size):
        """
        Set pagination parameters for the query.
        :param page: The page number (1-indexed)
        :param page_size: Number of items per page
        """
        self.pagination = {
            'offset': (page - 1) * page_size,
            'limit': page_size
        }

    def build_query(self, action="select", additional_clauses=None, data=None):

        if action == "select":
            query = f"SELECT {', '.join(self.select_columns)} FROM {self.table_name}"
        elif action == "insert":
            columns = ', '.join(data.keys())
            placeholders = ', '.join(f'%({k})s' for k in data.keys())
            query = f"INSERT INTO {self.table_name} ({columns}) VALUES ({placeholders})"
        elif action == "update":
            set_clause = ', '.join(f"{k} = %({k})s" for k in data.keys())
            query = f"UPDATE {self.table_name} SET {set_clause}"
        elif action == "delete":
            query = f"DELETE FROM {self.table_name}"

        for join in self.joins:
            query += f" {join}"
        for subquery, alias in self.sub_queries:
            query += f", ({subquery}) AS {alias}"
        if self.constraints:
            query += " WHERE " + " AND ".join(self.constraints)
        if action == "select":
            if self.group_by_clause:
                query += " GROUP BY " + self.group_by_clause
            if self.sort_clause:
                query += " ORDER BY " + self.sort_clause
            if self.order_clause:
                query += " " + self.order_clause
            if hasattr(self, 'pagination') and self.pagination:
                query += " LIMIT %(limit)s OFFSET %(offset)s"
                self.params.update(self.pagination)

        if additional_clauses:
            query += " " + additional_clauses

        logging.info(f"Query: {query}")
        return query

    def execute_query(self, query, data=None):
        try:
            with self.client.PostgresClient() as cur:
                mogrified_query = cur.mogrify(query, {**data, **self.params} if data else self.params)
                cur.execute(mogrified_query)
                return cur.fetchall() if cur.description else None
        except Exception as e:
            self.logger.error(f"Database operation failed: {e}")
            raise

    def fetchall(self):
        query = self.build_query()
        return self.execute_query(query)

    def fetchone(self):
        query = self.build_query()
        result = self.execute_query(query)
        return result[0] if result else None

    def insert(self, data):
        query = self.build_query(action="insert", data=data)
        query += " RETURNING *;"

        result = self.execute_query(query, data)
        return result[0] if result else None

    def update(self, data):
        query = self.build_query(action="update", data=data)
        query += " RETURNING *;"

        result = self.execute_query(query, data)
        return result[0] if result else None

    def delete(self):
        query = self.build_query(action="delete")
        return self.execute_query(query)

    def batch_insert(self, items):
        if not items:
            return None

        columns = ', '.join(items[0].keys())

        # Building a values string with unique parameter names for each item
        all_values_query = ', '.join(
            '(' + ', '.join([f"%({key}_{i})s" for key in item]) + ')'
            for i, item in enumerate(items)
        )

        query = f"INSERT INTO {self.table_name} ({columns}) VALUES {all_values_query} RETURNING *;"

        try:
            with self.client.PostgresClient() as cur:
                # Flatten items into a single dictionary with unique keys
                combined_params = {f"{k}_{i}": v for i, item in enumerate(items) for k, v in item.items()}
                mogrified_query = cur.mogrify(query, combined_params)
                cur.execute(mogrified_query)
                return cur.fetchall()
        except Exception as e:
            self.logger.error(f"Database batch insert operation failed: {e}")
            raise

    def raw_query(self, query, params=None):
        try:
            with self.client.PostgresClient() as cur:
                mogrified_query = cur.mogrify(query, params)
                cur.execute(mogrified_query)
                return cur.fetchall() if cur.description else None
        except Exception as e:
            self.logger.error(f"Database operation failed: {e}")
            raise

    def batch_update(self, items):
        if not items:
            return None

        id_column = list(items[0])[0]

        # Building the set clause for the update statement
        update_columns = list(items[0].keys())
        update_columns.remove(id_column)
        set_clause = ', '.join([f"{col} = v.{col}" for col in update_columns])

        # Building the values part for the 'VALUES' section
        values_rows = []
        for item in items:
            values = ', '.join([f"%({key})s" for key in item.keys()])
            values_rows.append(f"({values})")
        values_query = ', '.join(values_rows)

        # Constructing the full update query
        query = f"""
            UPDATE {self.table_name} AS t 
            SET {set_clause} 
            FROM (VALUES {values_query}) AS v ({', '.join(items[0].keys())}) 
            WHERE t.{id_column} = v.{id_column};
        """

        try:
            with self.client.PostgresClient() as cur:
                # Flatten items into a single dictionary for mogrify
                combined_params = {k: v for item in items for k, v in item.items()}
                mogrified_query = cur.mogrify(query, combined_params)
                cur.execute(mogrified_query)
        except Exception as e:
            self.logger.error(f"Database batch update operation failed: {e}")
            raise

import unittest
import datetime
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from chalicelib.core.usability_testing.service import search_ui_tests, create_ut_test, get_ut_test, delete_ut_test, \
    update_ut_test

from chalicelib.core.usability_testing.schema import UTTestSearch, UTTestCreate, UTTestUpdate


class TestUsabilityTesting(unittest.TestCase):
    def setUp(self):
        self.mocked_pool = patch('chalicelib.utils.pg_client.postgreSQL_pool').start()
        self.mocked_pool.getconn.return_value = MagicMock()

        # Mocking the PostgresClient
        self.mock_pg_client = patch('chalicelib.utils.pg_client.PostgresClient').start()
        self.mocked_cursor = MagicMock()
        self.mock_pg_client.return_value.__enter__.return_value = self.mocked_cursor

        # Mocking init and terminate functions
        self.mocked_init = patch('chalicelib.utils.pg_client.init').start()
        self.mocked_terminate = patch('chalicelib.utils.pg_client.terminate').start()

    def tearDown(self):
        patch.stopall()

    def test_search_ui_tests_returns_correct_data(self):
        self.mocked_cursor.fetchall.return_value = [
            {
                "count": 1,
                "test_id": 123,
                "title": "Test",
                "description": "Description",
                "is_active": True,
                "created_by": 1,
                "created_at": datetime.datetime.now().isoformat(),
                "updated_at": datetime.datetime.now().isoformat(),
            },
        ]

        result = search_ui_tests(1, UTTestSearch(page=1, limit=10, sort_by='test_id', sort_order='asc'))

        result = result['data']

        self.assertEqual(1, len(result['list']))
        self.assertEqual(1, result['total'])
        self.assertEqual(1, result['page'])
        self.assertEqual(10, result['limit'])

    def test_create_ut_test_creates_record(self):
        data = UTTestCreate(title="Test", description="Description", is_active=True, project_id=1, status="preview")
        self.mocked_cursor.fetchall.return_value = [
            {
                "project_id": 1,
                "status": "preview",
                "test_id": 123,
                "title": "Test",
                "description": "Description",
                "is_active": True,
                "created_by": 1,
                "created_at": datetime.datetime.now().isoformat(),
                "updated_at": datetime.datetime.now().isoformat(),
            }
        ]

        result = create_ut_test(data)

        self.assertEqual(result['data']['testId'], 123)
        self.assertEqual(result['data']['title'], "Test")
        self.assertEqual(result['data']['description'], "Description")
        self.assertEqual(result['data']['isActive'], True)
        self.assertEqual(result['data']['createdBy'], 1)
        self.assertEqual(result['data']['status'], "preview")

    def test_get_ut_test_returns_correct_data(self):
        self.mocked_cursor.fetchall.return_value = [
            {
                "test_id": 123,
                "title": "Test",
                "created_by": 1,
                "created_at": datetime.datetime.now().isoformat(),
                "updated_at": datetime.datetime.now().isoformat(),
                "tasks": [
                    {
                        "task_id": 1,
                        "test_id": 123,
                        "title": "Task",
                        "description": "Description",
                        "allow_typing": True,
                    }
                ]
            }
        ]

        result = get_ut_test(1, 123)

        self.assertIsNotNone(result['data'])
        self.assertEqual(result['data']['testId'], 123)
        self.assertEqual(result['data']['title'], "Test")

        self.mocked_cursor.fetchall.return_value = None
        with self.assertRaises(HTTPException):
            get_ut_test(1, 999)

    def test_delete_ut_test_deletes_record(self):
        self.mocked_cursor.return_value = 1

        result = delete_ut_test(1, 123)

        self.assertEqual(result['status'], 'success')

    # def test_update_ut_test_updates_record(self):
    #     self.mocked_cursor.fetchall.return_value = [
    #         {
    #             "test_id": 123,
    #             "title": "Test",
    #             "created_by": 1,
    #             "created_at": datetime.datetime.now().isoformat(),
    #             "updated_at": datetime.datetime.now().isoformat(),
    #             "tasks": [
    #                 {
    #                     "task_id": 1,
    #                     "test_id": 123,
    #                     "title": "Task",
    #                     "description": "Description",
    #                     "allow_typing": True,
    #                 }
    #             ]
    #         }
    #     ]
    #
    #     result = update_ut_test(1, 123, UTTestUpdate(title="Updated Test"))
    #     self.assertEqual(result['status'], 'success')

    # def test_update_status_updates_status(self):
    #     self.mock_pg_client.PostgresClient.return_value.__enter__.return_value.rowcount = 1
    #
    #     result = update_status(1, 123, 'active')
    #
    #     self.assertEqual('active', result['status'])


if __name__ == '__main__':
    unittest.main()

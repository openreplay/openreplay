import json

from pydantic.error_wrappers import ValidationError

import schemas
from chalicelib.core.feature_flags import prepare_conditions_values, prepare_variants_values


class TestFeatureFlag:
    def test_prepare_conditions_values(self):
        feature_flag_data = schemas.FeatureFlagSchema(
            flagKey="flag_2",
            conditions=[
                schemas.FeatureFlagCondition(
                    name="Condition 2",
                    rolloutPercentage=75,
                    filters=[{"key": "value1"}]
                ),
                schemas.FeatureFlagCondition(
                    name="Condition 3",
                    rolloutPercentage=25,
                    filters=[{"key": "value2"}]
                )
            ]
        )
        expected_output = {
            'condition_id_0': None,
            "name_0": "Condition 2",
            "rollout_percentage_0": 75,
            "filters_0": json.dumps([{"key": "value1"}]),
            'condition_id_1': None,
            "name_1": "Condition 3",
            "rollout_percentage_1": 25,
            "filters_1": json.dumps([{"key": "value2"}])
        }
        assert prepare_conditions_values(feature_flag_data) == expected_output

    def test_feature_flag_schema_validation(self):
        try:
            schemas.FeatureFlagSchema(
                flagKey="valid_flag",
                conditions=[
                    schemas.FeatureFlagCondition(name="Condition 1", rollout_percentage=50),
                    schemas.FeatureFlagCondition(name="Condition 2", rollout_percentage=25)
                ],
                variants=[
                    schemas.FeatureFlagVariant(value="Variant 1", rollout_percentage=50),
                    schemas.FeatureFlagVariant(value="Variant 2", rollout_percentage=50)
                ]
            )
        except ValidationError:
            assert False, "Valid data should not raise ValidationError"

        try:
            schemas.FeatureFlagSchema()
        except ValidationError as e:
            assert len(e.errors()) == 1
            for error in e.errors():
                assert error["type"] == "value_error.missing"
                assert error["loc"] in [("flagKey",)]
        else:
            assert False, "Invalid data should raise ValidationError"

    def test_feature_flag_variant_schema_validation(self):
        try:
            schemas.FeatureFlagVariant(
                value="Variant Value",
                description="Variant Description",
                # payload={"key": "value"},
                rolloutPercentage=50
            )
        except ValidationError:
            assert False, "Valid data should not raise ValidationError"

        try:
            schemas.FeatureFlagVariant()
        except ValidationError as e:
            assert len(e.errors()) == 1
            error = e.errors()[0]
            assert error["type"] == "value_error.missing"
            assert error["loc"] == ("value",)
        else:
            assert False, "Invalid data should raise ValidationError"

    def test_feature_flag_condition_schema_validation(self):
        try:
            schemas.FeatureFlagCondition(
                name="Condition Name",
                rolloutPercentage=50,
                filters=[{"key": "value"}]
            )
        except ValidationError:
            assert False, "Valid data should not raise ValidationError"

        try:
            schemas.FeatureFlagCondition()
        except ValidationError as e:
            assert len(e.errors()) == 1
            error = e.errors()[0]
            assert error["type"] == "value_error.missing"
            assert error["loc"] == ("name",)
        else:
            assert False, "Invalid data should raise ValidationError"

    def test_search_flags_schema_validation(self):
        try:
            schemas.SearchFlagsSchema(
                limit=15,
                user_id=123,
                order=schemas.SortOrderType.desc,
                query="search term",
                is_active=True
            )
        except ValidationError:
            assert False, "Valid data should not raise ValidationError"

        try:
            schemas.SearchFlagsSchema(
                limit=500,
                user_id=-1,
                order="invalid",
                query="a" * 201,
                isActive=None
            )
        except ValidationError as e:
            assert len(e.errors()) == 2
            assert e.errors()[0]["ctx"] == {'limit_value': 200}
            assert e.errors()[0]["type"] == "value_error.number.not_le"

            assert e.errors()[1]["msg"] == "value is not a valid enumeration member; permitted: 'ASC', 'DESC'"
            assert e.errors()[1]["type"] == "type_error.enum"
        else:
            assert False, "Invalid data should raise ValidationError"

    def test_prepare_variants_values_single_variant(self):
        feature_flag_data = schemas.FeatureFlagSchema(
            flagKey="flag_1",
            variants=[
                schemas.FeatureFlagVariant(
                    value="Variant 1",
                    description="Description 1",
                    # payload="{'key': 'value1'}",
                    rolloutPercentage=50
                )
            ]
        )
        expected_output = {
            "v_value_0": "Variant 1",
            "v_description_0": "Description 1",
            # "payload_0": json.dumps({"key": "value1"}),
            'v_payload_0': 'null',
            "v_rollout_percentage_0": 50
        }
        assert prepare_variants_values(feature_flag_data) == expected_output

    def test_prepare_variants_values_multiple_variants(self):
        feature_flag_data = schemas.FeatureFlagSchema(
            flagKey="flag_2",
            variants=[
                schemas.FeatureFlagVariant(
                    value="Variant 1",
                    description="Description 1",
                    # payload="{'key': 'value1'}",
                    rolloutPercentage=50
                ),
                schemas.FeatureFlagVariant(
                    value="Variant 2",
                    description="Description 2",
                    # payload="{'key': 'value1'}",
                    rolloutPercentage=50
                )
            ]
        )
        expected_output = {
            "v_value_0": "Variant 1",
            "v_description_0": "Description 1",
            # "payload_0": json.dumps({"key": "value1"}),
            'v_payload_0': 'null',
            "v_rollout_percentage_0": 50,
            "v_value_1": "Variant 2",
            "v_description_1": "Description 2",
            # "payload_1": json.dumps({"key": "value2"}),
            'v_payload_1': 'null',
            "v_rollout_percentage_1": 50
        }
        assert prepare_variants_values(feature_flag_data) == expected_output

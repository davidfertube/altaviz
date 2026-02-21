"""
Load Tests — Validate Performance at Fleet Scale

Tests fleet simulator, schema validation, and failure scenarios.
Uses smaller fleet sizes (100-500) to keep CI fast.

Author: David Fernandez
"""

import pytest


class TestFleetSimulator:
    def test_generates_correct_compressor_count(self):
        from src.data_simulator.fleet_simulator import FleetSimulator
        sim = FleetSimulator(n_compressors=100, days=1, interval_minutes=60)
        assert len(sim.get_metadata_df()) == 100

    def test_generates_correct_reading_count(self):
        from src.data_simulator.fleet_simulator import FleetSimulator
        sim = FleetSimulator(n_compressors=10, days=1, interval_minutes=60)
        batch = sim.generate_readings_batch(0, 10)
        assert len(batch) == 10 * 24

    def test_failure_assignments_match_rate(self):
        from src.data_simulator.fleet_simulator import FleetSimulator
        sim = FleetSimulator(n_compressors=1000, days=1, failure_rate=0.05)
        n_failing = len(sim.failure_assignments)
        assert 30 <= n_failing <= 70

    def test_basin_distribution_covers_all_basins(self):
        from src.data_simulator.fleet_simulator import FleetSimulator
        sim = FleetSimulator(n_compressors=500, days=1)
        assert len(sim.get_metadata_df()['basin'].unique()) >= 5

    def test_stations_generated(self):
        from src.data_simulator.fleet_simulator import FleetSimulator
        sim = FleetSimulator(n_compressors=500, days=1)
        stations = sim.get_stations_df()
        assert len(stations) > 10
        for col in ['latitude', 'longitude', 'basin']:
            assert col in stations.columns

    def test_manufacturer_distribution(self):
        from src.data_simulator.fleet_simulator import FleetSimulator
        sim = FleetSimulator(n_compressors=1000, days=1)
        mfgs = sim.get_metadata_df()['manufacturer'].value_counts()
        assert mfgs.index[0] == "Ariel"
        assert len(mfgs) >= 4

    def test_batch_generation_is_memory_efficient(self):
        from src.data_simulator.fleet_simulator import FleetSimulator
        sim = FleetSimulator(n_compressors=100, days=1, interval_minutes=60)
        batch_count = sum(1 for _ in sim.generate_all_readings(batch_size=25))
        assert batch_count == 4


class TestCompressorProfiles:
    def test_models_have_valid_ranges(self):
        from src.data_simulator.compressor_profiles import COMPRESSOR_MODELS
        for model in COMPRESSOR_MODELS:
            assert model.hp_range[0] < model.hp_range[1]
            assert model.normal_vibration[0] < model.normal_vibration[1]

    def test_model_weights_sum_to_one(self):
        from src.data_simulator.compressor_profiles import COMPRESSOR_MODELS
        total = sum(m.weight_in_fleet for m in COMPRESSOR_MODELS)
        assert abs(total - 1.0) < 0.01

    def test_basins_cover_major_regions(self):
        from src.data_simulator.compressor_profiles import BASINS
        names = {b.name for b in BASINS}
        for basin in ["Permian Basin", "Eagle Ford", "Marcellus", "Haynesville"]:
            assert basin in names


class TestFailureScenarios:
    def test_all_failure_modes_defined(self):
        from src.data_simulator.failure_scenarios import FLEET_SCENARIOS, FailureMode
        for mode in FailureMode:
            assert mode in FLEET_SCENARIOS

    def test_degradation_increases_over_time(self):
        from src.data_simulator.failure_scenarios import FLEET_SCENARIOS, FailureMode
        scenario = FLEET_SCENARIOS[FailureMode.BEARING_WEAR]
        baseline = 3.0
        day_0 = scenario.apply_vibration(baseline, scenario.onset_day - 1)
        day_3 = scenario.apply_vibration(baseline, scenario.onset_day + 3)
        day_5 = scenario.apply_vibration(baseline, scenario.onset_day + 5)
        assert day_0 == baseline
        assert day_3 > baseline
        assert day_5 > day_3

    def test_assignments_are_deterministic(self):
        from src.data_simulator.failure_scenarios import assign_fleet_failures
        a1 = assign_fleet_failures(1000, seed=42)
        a2 = assign_fleet_failures(1000, seed=42)
        assert set(a1.keys()) == set(a2.keys())


class TestSchemaRegistry:
    def test_valid_message_passes(self):
        from src.ingestion.schema_registry import validate_message
        msg = {'compressor_id': 'COMP-0001', 'timestamp': '2026-02-18T12:00:00', 'vibration_mms': 3.5}
        is_valid, errors = validate_message(msg)
        assert is_valid

    def test_missing_required_field_fails(self):
        from src.ingestion.schema_registry import validate_message
        msg = {'timestamp': '2026-02-18T12:00:00'}
        is_valid, _ = validate_message(msg)
        assert not is_valid

    def test_out_of_range_value_fails(self):
        from src.ingestion.schema_registry import validate_message
        msg = {'compressor_id': 'COMP-0001', 'timestamp': '2026-02-18T12:00:00', 'vibration_mms': 999.0}
        is_valid, _ = validate_message(msg)
        assert not is_valid

    def test_batch_validation(self):
        from src.ingestion.schema_registry import validate_batch
        messages = [
            {'compressor_id': 'COMP-0001', 'timestamp': '2026-02-18T12:00:00'},
            {'compressor_id': 'COMP-0002', 'timestamp': '2026-02-18T12:00:00'},
            {'timestamp': '2026-02-18T12:00:00'},
        ]
        valid, dead = validate_batch(messages)
        assert len(valid) == 2
        assert len(dead) == 1

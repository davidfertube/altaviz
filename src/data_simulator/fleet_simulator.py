"""
Fleet Simulator — 4,700 Compressor Production-Scale Data Generator

Generates realistic sensor telemetry for Archrock-scale fleet:
- 4,700 compressors across 10 basins, ~200 stations
- 5-minute reading intervals (standard SCADA/Detechtion IIoT cycle)
- Realistic failure modes applied to ~5% of fleet
- Outputs to Parquet (partitioned by date) or Event Hubs messages

Scale math:
- 4,700 compressors x 288 readings/day = 1,353,600 readings/day
- 10 days of data = 13,536,000 readings (~2.5 GB Parquet)
- Per reading: ~200 bytes = ~270 MB/day

Usage:
    python -m src.data_simulator.fleet_simulator                    # Full fleet (4,700)
    python -m src.data_simulator.fleet_simulator --compressors 100  # Smaller test
    python -m src.data_simulator.fleet_simulator --days 30          # 30 days of data
    python -m src.data_simulator.fleet_simulator --output eventhub  # Stream to Event Hubs

Author: David Fernandez
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Generator
import json
import logging
import random

from src.data_simulator.compressor_profiles import (
    COMPRESSOR_MODELS,
    BASINS,
    select_compressor_model,
    generate_station_id,
    generate_compressor_id,
)
from src.data_simulator.failure_scenarios import (
    assign_fleet_failures,
    Severity,
)

logger = logging.getLogger(__name__)


class FleetSimulator:
    """
    Production-scale fleet simulator for 4,700+ compressor units.

    Generates data in batches to manage memory:
    - Fleet metadata generated once
    - Sensor readings generated per-station (parallelizable)
    - Failure scenarios applied per-compressor
    """

    def __init__(
        self,
        n_compressors: int = 4700,
        days: int = 10,
        interval_minutes: int = 5,
        failure_rate: float = 0.05,
        seed: int = 42,
    ):
        self.n_compressors = n_compressors
        self.days = days
        self.interval_minutes = interval_minutes
        self.failure_rate = failure_rate
        self.readings_per_day = (24 * 60) // interval_minutes    # 288 at 5-min
        self.total_readings_per_unit = self.readings_per_day * days

        self.rng = random.Random(seed)
        self.np_rng = np.random.RandomState(seed)

        # Generate fleet definition
        self.fleet = self._build_fleet()
        self.failure_assignments = assign_fleet_failures(
            n_compressors, failure_rate=failure_rate, seed=seed
        )

        n_failing = len(self.failure_assignments)
        logger.info(
            f"Fleet initialized: {n_compressors} compressors, "
            f"{len(self.fleet['stations'])} stations, "
            f"{n_failing} with active degradation ({n_failing/n_compressors:.1%})"
        )

    def _build_fleet(self) -> Dict:
        """Build the full fleet definition: stations, compressors, metadata.

        Distributes compressors proportionally across basins based on each
        basin's total station capacity, so even small fleets (e.g. 500 units
        in tests) span multiple basins — matching real geographic spread.
        """
        stations = []
        compressors = []
        global_idx = 1

        # Calculate proportional allocation per basin
        total_capacity = sum(
            b.station_count * (b.compressors_per_station[0] + b.compressors_per_station[1]) / 2
            for b in BASINS
        )
        basin_targets = {}
        allocated = 0
        for i, basin in enumerate(BASINS):
            avg_cap = basin.station_count * (basin.compressors_per_station[0] + basin.compressors_per_station[1]) / 2
            if i == len(BASINS) - 1:
                basin_targets[basin.name] = self.n_compressors - allocated
            else:
                target = max(1, round(self.n_compressors * avg_cap / total_capacity))
                basin_targets[basin.name] = target
                allocated += target

        for basin in BASINS:
            target_for_basin = basin_targets[basin.name]
            placed_in_basin = 0

            # Scale station count proportionally for small fleets
            n_stations = max(1, round(basin.station_count * self.n_compressors / 4700))

            for station_idx in range(1, n_stations + 1):
                if placed_in_basin >= target_for_basin or global_idx > self.n_compressors:
                    break

                station_id = generate_station_id(basin.name, station_idx)
                lat = self.rng.uniform(*basin.lat_range)
                lon = self.rng.uniform(*basin.lon_range)

                remaining_for_basin = target_for_basin - placed_in_basin
                remaining_stations = n_stations - station_idx + 1
                avg_per_station = max(1, remaining_for_basin // remaining_stations)
                n_at_station = min(
                    self.rng.randint(max(1, avg_per_station - 2), avg_per_station + 2),
                    remaining_for_basin,
                )

                stations.append({
                    'station_id': station_id,
                    'station_name': f"{basin.name} Station {station_idx}",
                    'basin': basin.name,
                    'region': basin.region,
                    'state': self.rng.choice(basin.states),
                    'latitude': round(lat, 6),
                    'longitude': round(lon, 6),
                    'elevation_ft': basin.avg_elevation_ft + self.rng.randint(-200, 200),
                    'timezone': basin.timezone,
                    'compressor_count': n_at_station,
                })

                for _ in range(n_at_station):
                    if global_idx > self.n_compressors:
                        break

                    model = select_compressor_model(self.rng)
                    hp = self.rng.randint(*model.hp_range)
                    install_date = (
                        datetime.now() - timedelta(days=self.rng.randint(180, 3650))
                    ).date()

                    compressors.append({
                        'compressor_id': generate_compressor_id(global_idx),
                        'station_id': station_id,
                        'basin': basin.name,
                        'region': basin.region,
                        'state': self.rng.choice(basin.states),
                        'model': model.name,
                        'manufacturer': model.manufacturer,
                        'type': model.type,
                        'horsepower': hp,
                        'cylinders': model.cylinders,
                        'install_date': str(install_date),
                        'latitude': round(lat + self.rng.uniform(-0.01, 0.01), 6),
                        'longitude': round(lon + self.rng.uniform(-0.01, 0.01), 6),
                        '_model_ref': model,
                    })
                    global_idx += 1
                    placed_in_basin += 1

        # Fill remaining compressors (rounding leftovers) into random basins
        while global_idx <= self.n_compressors:
            basin = self.rng.choice(BASINS)
            model = select_compressor_model(self.rng)
            station_id = generate_station_id(basin.name, self.rng.randint(1, max(1, basin.station_count)))
            hp = self.rng.randint(*model.hp_range)

            compressors.append({
                'compressor_id': generate_compressor_id(global_idx),
                'station_id': station_id,
                'basin': basin.name,
                'region': basin.region,
                'state': self.rng.choice(basin.states),
                'model': model.name,
                'manufacturer': model.manufacturer,
                'type': model.type,
                'horsepower': hp,
                'cylinders': model.cylinders,
                'install_date': str((datetime.now() - timedelta(days=self.rng.randint(180, 3650))).date()),
                'latitude': round(self.rng.uniform(*basin.lat_range), 6),
                'longitude': round(self.rng.uniform(*basin.lon_range), 6),
                '_model_ref': model,
            })
            global_idx += 1

        return {'stations': stations, 'compressors': compressors}

    def get_metadata_df(self) -> pd.DataFrame:
        """Return compressor metadata as a DataFrame (excludes internal fields)."""
        records = [
            {k: v for k, v in c.items() if not k.startswith('_')}
            for c in self.fleet['compressors']
        ]
        return pd.DataFrame(records)

    def get_stations_df(self) -> pd.DataFrame:
        """Return station metadata as a DataFrame."""
        return pd.DataFrame(self.fleet['stations'])

    def generate_readings_batch(
        self,
        start_idx: int = 0,
        batch_size: int = 500,
    ) -> pd.DataFrame:
        """
        Generate sensor readings for a batch of compressors.

        Memory-efficient: processes batch_size compressors at a time.
        For 4,700 compressors with 10 batches of 470:
        - Each batch: ~470 * 2,880 = 1,353,600 readings
        - Memory per batch: ~250 MB

        Args:
            start_idx: Starting compressor index
            batch_size: Number of compressors per batch

        Returns:
            DataFrame with sensor readings for this batch
        """
        end_idx = min(start_idx + batch_size, len(self.fleet['compressors']))
        batch_compressors = self.fleet['compressors'][start_idx:end_idx]

        start_time = datetime.now() - timedelta(days=self.days)
        all_readings = []

        for comp_idx_in_fleet, comp in enumerate(batch_compressors, start=start_idx):
            model = comp['_model_ref']
            comp_id = comp['compressor_id']

            # Generate baselines for this compressor
            baselines = {
                'vibration_mms': self.np_rng.uniform(*model.normal_vibration),
                'discharge_temp_f': self.np_rng.uniform(*model.normal_discharge_temp),
                'suction_pressure_psi': self.np_rng.uniform(*model.normal_suction_pressure),
                'discharge_pressure_psi': self.np_rng.uniform(*model.normal_discharge_pressure),
                'gas_flow_mcf': self.np_rng.uniform(*model.normal_flow_mcf),
                'horsepower_consumption': float(comp['horsepower']) * self.np_rng.uniform(0.7, 0.95),
            }

            # Check if this compressor has a failure scenario
            failure_info = self.failure_assignments.get(comp_idx_in_fleet)

            # Generate all timestamps at once (vectorized)
            timestamps = pd.date_range(
                start=start_time,
                periods=self.total_readings_per_unit,
                freq=f'{self.interval_minutes}min',
            )

            for reading_idx in range(self.total_readings_per_unit):
                current_day = reading_idx // self.readings_per_day
                ts = timestamps[reading_idx]

                reading = {
                    'compressor_id': comp_id,
                    'timestamp': ts,
                    'station_id': comp['station_id'],
                    'basin': comp['basin'],
                }

                # Apply sensor values with optional failure degradation
                for sensor, baseline in baselines.items():
                    if failure_info is not None:
                        scenario, onset_offset = failure_info
                        adjusted_day = current_day
                        adjusted_onset = scenario.onset_day + onset_offset

                        if sensor == 'vibration_mms':
                            value = scenario.apply_vibration(baseline, adjusted_day - adjusted_onset + scenario.onset_day)
                        elif sensor == 'discharge_temp_f':
                            value = scenario.apply_temperature(baseline, adjusted_day - adjusted_onset + scenario.onset_day)
                        elif sensor in ('suction_pressure_psi', 'discharge_pressure_psi'):
                            is_discharge = sensor == 'discharge_pressure_psi'
                            value = scenario.apply_pressure(baseline, adjusted_day - adjusted_onset + scenario.onset_day, is_discharge)
                        elif sensor == 'gas_flow_mcf':
                            value = scenario.apply_flow(baseline, adjusted_day - adjusted_onset + scenario.onset_day)
                        else:
                            value = baseline
                    else:
                        value = baseline

                    # Add sensor noise (3% Gaussian)
                    value += self.np_rng.normal(0, 0.03 * abs(value))

                    # 0.5% chance of random spike (sensor glitch)
                    if self.np_rng.random() < 0.005:
                        value *= self.rng.choice([0.85, 1.15])

                    reading[sensor] = max(0, round(value, 2))

                reading['operating_hours'] = round((reading_idx * self.interval_minutes) / 60, 1)
                all_readings.append(reading)

        return pd.DataFrame(all_readings)

    def generate_all_readings(self, batch_size: int = 500) -> Generator[pd.DataFrame, None, None]:
        """
        Yield sensor readings in batches (memory-efficient generator).

        Usage:
            for batch_df in simulator.generate_all_readings():
                batch_df.to_parquet(...)  # Write each batch
        """
        n = len(self.fleet['compressors'])
        for start in range(0, n, batch_size):
            batch_num = start // batch_size + 1
            total_batches = (n + batch_size - 1) // batch_size
            logger.info(f"Generating batch {batch_num}/{total_batches} "
                        f"(compressors {start+1}-{min(start+batch_size, n)})")
            yield self.generate_readings_batch(start, batch_size)

    def save_to_parquet(self, output_dir: str = 'data/raw/fleet', batch_size: int = 500):
        """
        Save fleet data to partitioned Parquet files.

        Writes:
        - compressor_metadata.parquet (single file)
        - station_locations.parquet (single file)
        - sensor_readings/ (partitioned by date)
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Save metadata
        meta_df = self.get_metadata_df()
        meta_path = output_path / 'compressor_metadata.parquet'
        meta_df.to_parquet(meta_path, index=False)
        logger.info(f"Saved {len(meta_df)} compressor records to {meta_path}")

        stations_df = self.get_stations_df()
        stations_path = output_path / 'station_locations.parquet'
        stations_df.to_parquet(stations_path, index=False)
        logger.info(f"Saved {len(stations_df)} station records to {stations_path}")

        # Save sensor readings in batches (partitioned by date)
        readings_dir = output_path / 'sensor_readings'
        readings_dir.mkdir(exist_ok=True)

        total_rows = 0
        for batch_idx, batch_df in enumerate(self.generate_all_readings(batch_size)):
            batch_df['date'] = batch_df['timestamp'].dt.date.astype(str)

            for date_val, date_group in batch_df.groupby('date'):
                date_dir = readings_dir / f'date={date_val}'
                date_dir.mkdir(exist_ok=True)
                part_path = date_dir / f'batch_{batch_idx:04d}.parquet'
                date_group.drop(columns=['date']).to_parquet(part_path, index=False)

            total_rows += len(batch_df)
            logger.info(f"Batch {batch_idx}: {len(batch_df):,} rows written ({total_rows:,} total)")

        self._print_summary(total_rows)

    def generate_event_messages(self, batch_size: int = 100) -> Generator[List[Dict], None, None]:
        """
        Yield batches of Event Hub messages (JSON format).

        Each message represents one sensor reading, matching the
        Event Hubs ingestion schema.
        """
        for batch_df in self.generate_all_readings(batch_size):
            messages = []
            for _, row in batch_df.iterrows():
                msg = {
                    'compressor_id': row['compressor_id'],
                    'timestamp': row['timestamp'].isoformat(),
                    'station_id': row['station_id'],
                    'basin': row['basin'],
                    'vibration_mms': row['vibration_mms'],
                    'discharge_temp_f': row['discharge_temp_f'],
                    'suction_pressure_psi': row['suction_pressure_psi'],
                    'discharge_pressure_psi': row['discharge_pressure_psi'],
                    'horsepower_consumption': row['horsepower_consumption'],
                    'gas_flow_mcf': row['gas_flow_mcf'],
                    'operating_hours': row['operating_hours'],
                }
                messages.append(msg)

                if len(messages) >= 1000:
                    yield messages
                    messages = []

            if messages:
                yield messages

    def _print_summary(self, total_rows: int):
        """Print fleet simulation summary."""
        meta_df = self.get_metadata_df()
        n_failing = len(self.failure_assignments)
        basins = meta_df['basin'].value_counts()
        manufacturers = meta_df['manufacturer'].value_counts()
        total_hp = meta_df['horsepower'].sum()

        print("\n" + "=" * 70)
        print("FLEET SIMULATION SUMMARY")
        print("=" * 70)
        print(f"  Total compressors:    {self.n_compressors:,}")
        print(f"  Total stations:       {len(self.fleet['stations']):,}")
        print(f"  Total horsepower:     {total_hp:,.0f} HP ({total_hp/1e6:.1f}M HP)")
        print(f"  Total readings:       {total_rows:,}")
        print(f"  Days simulated:       {self.days}")
        print(f"  Reading interval:     {self.interval_minutes} min")
        print(f"  Degrading units:      {n_failing} ({n_failing/self.n_compressors:.1%})")
        print(f"\n  Basin distribution:")
        for basin, count in basins.items():
            print(f"    {basin:20s}: {count:,} compressors")
        print(f"\n  Manufacturer distribution:")
        for mfg, count in manufacturers.items():
            print(f"    {mfg:20s}: {count:,} units")
        print("=" * 70)


def main():
    """CLI entry point for fleet simulation."""
    import argparse

    logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(name)s] %(message)s')

    parser = argparse.ArgumentParser(description='Altaviz Fleet Simulator (Production Scale)')
    parser.add_argument('--compressors', type=int, default=4700,
                        help='Number of compressors (default: 4700)')
    parser.add_argument('--days', type=int, default=10,
                        help='Days of data to generate (default: 10)')
    parser.add_argument('--interval', type=int, default=5,
                        help='Reading interval in minutes (default: 5)')
    parser.add_argument('--batch-size', type=int, default=500,
                        help='Compressors per batch (default: 500)')
    parser.add_argument('--output', choices=['parquet', 'eventhub'], default='parquet',
                        help='Output format (default: parquet)')
    parser.add_argument('--output-dir', type=str, default='data/raw/fleet',
                        help='Output directory (default: data/raw/fleet)')
    parser.add_argument('--seed', type=int, default=42,
                        help='Random seed (default: 42)')

    args = parser.parse_args()

    print("=" * 70)
    print(f"ALTAVIZ FLEET SIMULATOR — {args.compressors:,} COMPRESSORS")
    print("=" * 70)

    simulator = FleetSimulator(
        n_compressors=args.compressors,
        days=args.days,
        interval_minutes=args.interval,
        seed=args.seed,
    )

    if args.output == 'parquet':
        simulator.save_to_parquet(output_dir=args.output_dir, batch_size=args.batch_size)
    elif args.output == 'eventhub':
        # Stream to Event Hubs (requires azure-eventhub)
        from src.ingestion.event_hub_producer import stream_to_event_hubs
        stream_to_event_hubs(simulator)

    print("\nFleet simulation complete.")


if __name__ == '__main__':
    main()

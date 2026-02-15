"""
Compressor Health Data Simulator

Generates realistic synthetic sensor data for natural gas compressor units.
Simulates:
- Normal operation with natural variance
- Gradual degradation patterns
- Anomalous events and failures

Author: David Fernandez
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
import json
from typing import List, Dict, Tuple
import random

# Set random seeds for reproducibility
np.random.seed(42)
random.seed(42)


class CompressorSimulator:
    """Simulates sensor data for natural gas compressor units"""

    def __init__(self, n_compressors: int = 10, days: int = 10, interval_minutes: int = 10):
        """
        Initialize simulator

        Args:
            n_compressors: Number of compressor units to simulate
            days: Number of days of data to generate
            interval_minutes: Reading interval in minutes
        """
        self.n_compressors = n_compressors
        self.days = days
        self.interval_minutes = interval_minutes
        self.readings_per_day = (24 * 60) // interval_minutes
        self.total_readings = self.readings_per_day * days

        # Compressor models and specs
        self.models = ["Ajax DPC-360", "Ariel JGK/4", "Caterpillar G3516", "Waukesha 7042GSI"]
        self.horsepower_ratings = [1340, 1480, 1775, 1340]

        # Normal operating ranges
        self.normal_ranges = {
            'vibration_mms': (1.5, 4.5),           # mm/s
            'discharge_temp_f': (180, 220),         # °F
            'suction_pressure_psi': (40, 80),       # PSI
            'discharge_pressure_psi': (900, 1200),  # PSI
            'horsepower_consumption': (1200, 1600), # HP
            'gas_flow_mcf': (8000, 12000),          # Mcf/day
        }

        # Critical thresholds
        self.warning_thresholds = {
            'vibration_mms': 6.0,
            'discharge_temp_f': 240,
            'suction_pressure_psi': 30,
            'discharge_pressure_psi': 1300,
        }

        self.critical_thresholds = {
            'vibration_mms': 8.0,
            'discharge_temp_f': 260,
            'suction_pressure_psi': 20,
            'discharge_pressure_psi': 1400,
        }

        # Compressors that will experience failures/warnings
        # COMP-003 (idx 2), COMP-007 (idx 6), COMP-009 (idx 8)
        self.failure_compressors = [2, 6]  # Critical failures
        self.failure_start_days = [3, 5]  # Start degradation on day 3 and 5
        self.near_miss_compressor = 8  # COMP-009 - warning but prevented failure
        self.near_miss_start_day = 5
        self.near_miss_maintenance_day = 7

    def generate_compressor_metadata(self) -> pd.DataFrame:
        """Generate compressor fleet metadata"""
        compressors = []

        for i in range(self.n_compressors):
            model_idx = i % len(self.models)
            compressor = {
                'compressor_id': f'COMP-{str(i+1).zfill(3)}',
                'model': self.models[model_idx],
                'horsepower': self.horsepower_ratings[model_idx],
                'install_date': (datetime.now() - timedelta(days=random.randint(365, 1825))).date(),
                'station_id': f'STATION-{chr(65 + (i // 3))}'  # Groups of 3 per station
            }
            compressors.append(compressor)

        return pd.DataFrame(compressors)

    def _add_noise(self, value: float, noise_level: float = 0.02) -> float:
        """Add Gaussian noise to simulate sensor variance"""
        noise = np.random.normal(0, noise_level * value)
        return value + noise

    def _simulate_degradation(self,
                            day: int,
                            failure_day: int,
                            baseline: float,
                            sensor_type: str) -> float:
        """
        Simulate gradual degradation pattern

        Args:
            day: Current day number
            failure_day: Day when degradation starts
            baseline: Normal baseline value
            sensor_type: Type of sensor for degradation pattern
        """
        if day < failure_day:
            return baseline

        # Days since degradation started
        days_degrading = day - failure_day

        # Different degradation patterns for different sensors
        if sensor_type == 'vibration_mms':
            # Exponential increase in vibration
            multiplier = 1 + (days_degrading / 2) ** 1.5
        elif sensor_type == 'discharge_temp_f':
            # Linear temperature increase
            multiplier = 1 + (days_degrading * 0.15)
        elif sensor_type in ['suction_pressure_psi', 'discharge_pressure_psi']:
            # Pressure fluctuations
            multiplier = 1 + np.sin(days_degrading) * 0.3
        else:
            # Default linear degradation
            multiplier = 1 + (days_degrading * 0.1)

        return baseline * multiplier

    def generate_sensor_readings(self) -> pd.DataFrame:
        """Generate time-series sensor data for all compressors"""
        all_readings = []
        start_time = datetime.now() - timedelta(days=self.days)

        for comp_idx in range(self.n_compressors):
            compressor_id = f'COMP-{str(comp_idx+1).zfill(3)}'
            is_failing = comp_idx in self.failure_compressors
            is_near_miss = comp_idx == self.near_miss_compressor
            failure_day = self.failure_start_days[self.failure_compressors.index(comp_idx)] if is_failing else None

            # Generate baseline values for this compressor
            baseline_values = {
                sensor: np.random.uniform(range_tuple[0], range_tuple[1])
                for sensor, range_tuple in self.normal_ranges.items()
            }

            # Generate readings for each timestamp
            for reading_idx in range(self.total_readings):
                timestamp = start_time + timedelta(minutes=reading_idx * self.interval_minutes)
                current_day = reading_idx // self.readings_per_day

                reading = {'compressor_id': compressor_id, 'timestamp': timestamp}

                for sensor, baseline in baseline_values.items():
                    # Apply degradation if this compressor is failing
                    if is_failing and failure_day is not None:
                        value = self._simulate_degradation(current_day, failure_day, baseline, sensor)
                    # COMP-009 near-miss: warning level but no critical failure
                    elif is_near_miss:
                        if current_day >= self.near_miss_start_day and current_day < self.near_miss_maintenance_day:
                            # Degrading trend to warning level before maintenance
                            days_degrading = current_day - self.near_miss_start_day
                            if sensor == 'vibration_mms':
                                value = baseline + (days_degrading * 0.4)  # Reaches ~5.7 mm/s (warning)
                            elif sensor == 'discharge_temp_f':
                                value = baseline + (days_degrading * 3)  # Slight temp increase
                            else:
                                value = baseline
                        elif current_day >= self.near_miss_maintenance_day:
                            # After proactive maintenance: metrics return to healthy
                            if sensor == 'vibration_mms':
                                value = 3.8  # Back to healthy range
                            elif sensor == 'discharge_temp_f':
                                value = 180  # Back to normal
                            else:
                                value = baseline
                        else:
                            value = baseline
                    else:
                        value = baseline

                    # Add natural variance
                    value = self._add_noise(value, noise_level=0.03)

                    # Add occasional anomalies (spikes/drops) even in healthy compressors
                    if random.random() < 0.01:  # 1% chance of anomaly
                        value *= random.choice([0.85, 1.15])

                    # Ensure non-negative values
                    reading[sensor] = max(0, value)

                # Calculate operating hours (cumulative)
                reading['operating_hours'] = (reading_idx * self.interval_minutes) / 60

                all_readings.append(reading)

        df = pd.DataFrame(all_readings)

        # Round numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df[numeric_cols] = df[numeric_cols].round(2)

        return df

    def generate_maintenance_logs(self) -> pd.DataFrame:
        """Generate synthetic maintenance event logs with cost data"""
        import uuid
        logs = []
        start_date = datetime.now() - timedelta(days=self.days)

        for comp_idx in range(self.n_compressors):
            compressor_id = f'COMP-{str(comp_idx+1).zfill(3)}'
            is_failing = comp_idx in self.failure_compressors
            is_near_miss = comp_idx == self.near_miss_compressor

            # Skip scheduled maintenance for failing units and near-miss
            if not is_failing and not is_near_miss:
                # Scheduled quarterly maintenance (low cost)
                scheduled_date = start_date + timedelta(days=random.randint(1, self.days-1))
                logs.append({
                    'maintenance_id': str(uuid.uuid4()),
                    'compressor_id': compressor_id,
                    'maintenance_type': 'scheduled',
                    'description': 'Quarterly preventive maintenance - oil change, filter replacement, bearing inspection',
                    'performed_at': scheduled_date,
                    'cost_usd': 2000 + random.randint(-500, 500),  # $1,500-$2,500
                    'performed_by': random.choice(['Tech-A', 'Tech-B', 'Tech-C']),
                    'notes': 'All metrics within normal range post-maintenance'
                })

            # COMP-003 failure (high cost - unscheduled emergency)
            if comp_idx == 2:  # COMP-003
                failure_date = start_date + timedelta(days=6, hours=14)
                logs.append({
                    'maintenance_id': str(uuid.uuid4()),
                    'compressor_id': compressor_id,
                    'maintenance_type': 'failure',
                    'description': 'Emergency bearing replacement due to critical vibration levels',
                    'performed_at': failure_date,
                    'cost_usd': 18500,  # Emergency dispatch + parts + downtime
                    'performed_by': 'Emergency-Team-1',
                    'notes': 'Catastrophic bearing failure. Required emergency shutdown and expedited parts delivery. 12 hours downtime.'
                })

            # COMP-007 failure (high cost)
            if comp_idx == 6:  # COMP-007
                failure_date = start_date + timedelta(days=8, hours=10)
                logs.append({
                    'maintenance_id': str(uuid.uuid4()),
                    'compressor_id': compressor_id,
                    'maintenance_type': 'failure',
                    'description': 'Cooling system failure - temperature critical',
                    'performed_at': failure_date,
                    'cost_usd': 22000,  # Higher cost due to cooling system replacement
                    'performed_by': 'Emergency-Team-2',
                    'notes': 'Cooling system compressor failed. Required full system replacement. 16 hours downtime.'
                })

            # COMP-009 near-miss (predicted failure, scheduled early maintenance)
            if comp_idx == 8:  # COMP-009
                proactive_date = start_date + timedelta(days=7, hours=8)
                logs.append({
                    'maintenance_id': str(uuid.uuid4()),
                    'compressor_id': compressor_id,
                    'maintenance_type': 'scheduled',
                    'description': 'Proactive maintenance based on early warning indicators - bearing replacement',
                    'performed_at': proactive_date,
                    'cost_usd': 3200,  # Slightly higher than normal scheduled, but WAY less than emergency
                    'performed_by': 'Tech-A',
                    'notes': 'Vibration trending upward. Replaced bearings before critical threshold. Prevented $15K+ emergency repair.'
                })

        return pd.DataFrame(logs)

    def save_data(self, output_dir: str = 'data/raw'):
        """Generate and save all data files"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        print("Generating compressor metadata...")
        metadata_df = self.generate_compressor_metadata()
        metadata_path = output_path / 'compressor_metadata.csv'
        metadata_df.to_csv(metadata_path, index=False)
        print(f"✓ Saved {len(metadata_df)} compressor records to {metadata_path}")

        print(f"\nGenerating sensor readings ({self.total_readings * self.n_compressors} total)...")
        readings_df = self.generate_sensor_readings()
        readings_path = output_path / 'sensor_readings.csv'
        readings_df.to_csv(readings_path, index=False)
        print(f"✓ Saved {len(readings_df)} sensor readings to {readings_path}")

        # Also save as Parquet for faster loading
        parquet_path = output_path / 'sensor_readings.parquet'
        readings_df.to_parquet(parquet_path, index=False)
        print(f"✓ Saved Parquet format to {parquet_path}")

        print("\nGenerating maintenance logs...")
        logs_df = self.generate_maintenance_logs()
        logs_path = output_path / 'maintenance_logs.csv'
        logs_df.to_csv(logs_path, index=False)
        print(f"✓ Saved {len(logs_df)} maintenance logs to {logs_path}")

        # Generate summary statistics
        self._print_summary(metadata_df, readings_df, logs_df)

        return metadata_df, readings_df, logs_df

    def _print_summary(self, metadata_df, readings_df, logs_df):
        """Print data generation summary"""
        print("\n" + "="*60)
        print("DATA GENERATION SUMMARY")
        print("="*60)
        print(f"Compressors: {len(metadata_df)}")
        print(f"Time Range: {readings_df['timestamp'].min()} to {readings_df['timestamp'].max()}")
        print(f"Total Sensor Readings: {len(readings_df):,}")
        print(f"Readings per Compressor: {len(readings_df) // len(metadata_df):,}")
        print(f"Maintenance Events: {len(logs_df)}")
        print(f"Failing Units: {len(self.failure_compressors)} (IDs: {[f'COMP-{str(i+1).zfill(3)}' for i in self.failure_compressors]})")

        # Sensor statistics
        print("\n" + "-"*60)
        print("SENSOR VALUE RANGES")
        print("-"*60)
        for col in readings_df.select_dtypes(include=[np.number]).columns:
            if col != 'operating_hours':
                print(f"{col:30s} : {readings_df[col].min():.2f} - {readings_df[col].max():.2f}")

        print("\n" + "-"*60)
        print("SIMULATED FAILURES")
        print("-"*60)
        for i, comp_idx in enumerate(self.failure_compressors):
            comp_id = f'COMP-{str(comp_idx+1).zfill(3)}'
            failure_day = self.failure_start_days[i]
            print(f"{comp_id}: Degradation starts Day {failure_day}, Failure on Day {failure_day + 3}")

        print("="*60)


def main():
    """Main execution function"""
    print("=" * 70)
    print("COMPRESSOR HEALTH DATA SIMULATOR")
    print("=" * 70)
    print("\nGenerating synthetic sensor data for natural gas compressor fleet...")
    print()

    # Create simulator instance
    simulator = CompressorSimulator(
        n_compressors=10,
        days=10,
        interval_minutes=10
    )

    # Generate and save data
    simulator.save_data()

    print("\n✓ Data generation complete!")
    print("\nNext steps:")
    print("  1. Run PySpark ETL: python src/etl/pyspark_pipeline.py")
    print("  2. Train ML model: python src/ml/train.py")
    print("  3. Start dashboard: streamlit run src/dashboard/app.py")


if __name__ == '__main__':
    main()

"""
Compressor Fleet Profiles — Archrock-Scale Fleet Definition

Defines realistic compressor profiles for 4,700+ units across major
US natural gas basins. Models are based on real compressor manufacturers
(Ariel, Caterpillar, Waukesha, Ajax, Dresser-Rand) with realistic HP
ratings, operating parameters, and geographic distribution.

Archrock fleet reference:
- 4.7M total HP across 4,700+ compressor units
- Average ~1,000 HP per unit
- Ranges from 200 HP wellhead units to 5,000+ HP pipeline units
- Concentrated in Permian, Eagle Ford, Haynesville, Marcellus, SCOOP/STACK

Author: David Fernandez
"""

from dataclasses import dataclass, field
from typing import Dict, List, Tuple
import random


@dataclass
class CompressorModel:
    """Compressor manufacturer model specification."""
    name: str
    manufacturer: str
    type: str
    hp_range: Tuple[int, int]
    cylinders: int
    normal_vibration: Tuple[float, float]
    normal_discharge_temp: Tuple[float, float]
    normal_suction_pressure: Tuple[float, float]
    normal_discharge_pressure: Tuple[float, float]
    normal_flow_mcf: Tuple[float, float]
    weight_in_fleet: float    # Probability weight for random selection


@dataclass
class Basin:
    """Geographic basin definition with station distribution."""
    name: str
    region: str
    states: List[str]
    lat_range: Tuple[float, float]
    lon_range: Tuple[float, float]
    station_count: int
    compressors_per_station: Tuple[int, int]
    avg_elevation_ft: int
    timezone: str


# Compressor models available in fleet (weighted by real-world market share)
COMPRESSOR_MODELS = [
    CompressorModel(
        name="Ariel JGK/4",
        manufacturer="Ariel",
        type="Reciprocating",
        hp_range=(800, 2000),
        cylinders=4,
        normal_vibration=(1.2, 4.0),
        normal_discharge_temp=(175, 215),
        normal_suction_pressure=(45, 85),
        normal_discharge_pressure=(900, 1200),
        normal_flow_mcf=(6000, 14000),
        weight_in_fleet=0.30,    # Ariel dominates reciprocating market
    ),
    CompressorModel(
        name="Ariel JGT/2",
        manufacturer="Ariel",
        type="Reciprocating",
        hp_range=(200, 600),
        cylinders=2,
        normal_vibration=(1.0, 3.5),
        normal_discharge_temp=(170, 210),
        normal_suction_pressure=(40, 75),
        normal_discharge_pressure=(800, 1100),
        normal_flow_mcf=(2000, 6000),
        weight_in_fleet=0.15,
    ),
    CompressorModel(
        name="Caterpillar G3516",
        manufacturer="Caterpillar",
        type="Gas Engine",
        hp_range=(1600, 2500),
        cylinders=16,
        normal_vibration=(1.5, 5.0),
        normal_discharge_temp=(185, 225),
        normal_suction_pressure=(50, 90),
        normal_discharge_pressure=(950, 1300),
        normal_flow_mcf=(10000, 18000),
        weight_in_fleet=0.15,
    ),
    CompressorModel(
        name="Caterpillar G3606",
        manufacturer="Caterpillar",
        type="Gas Engine",
        hp_range=(2500, 5000),
        cylinders=6,
        normal_vibration=(2.0, 5.5),
        normal_discharge_temp=(190, 230),
        normal_suction_pressure=(55, 95),
        normal_discharge_pressure=(1000, 1400),
        normal_flow_mcf=(15000, 30000),
        weight_in_fleet=0.08,
    ),
    CompressorModel(
        name="Waukesha 7042GSI",
        manufacturer="Waukesha",
        type="Gas Engine",
        hp_range=(800, 1600),
        cylinders=12,
        normal_vibration=(1.3, 4.2),
        normal_discharge_temp=(178, 218),
        normal_suction_pressure=(42, 78),
        normal_discharge_pressure=(880, 1180),
        normal_flow_mcf=(5000, 12000),
        weight_in_fleet=0.12,
    ),
    CompressorModel(
        name="Ajax DPC-2802",
        manufacturer="Ajax",
        type="Integral",
        hp_range=(400, 1400),
        cylinders=4,
        normal_vibration=(1.8, 5.0),
        normal_discharge_temp=(180, 220),
        normal_suction_pressure=(38, 72),
        normal_discharge_pressure=(850, 1150),
        normal_flow_mcf=(3000, 10000),
        weight_in_fleet=0.10,
    ),
    CompressorModel(
        name="Dresser-Rand HOS",
        manufacturer="Dresser-Rand",
        type="Reciprocating",
        hp_range=(1000, 3000),
        cylinders=6,
        normal_vibration=(1.4, 4.5),
        normal_discharge_temp=(182, 222),
        normal_suction_pressure=(48, 88),
        normal_discharge_pressure=(920, 1250),
        normal_flow_mcf=(8000, 16000),
        weight_in_fleet=0.10,
    ),
]

# Major natural gas basins where Archrock operates
BASINS = [
    Basin(
        name="Permian Basin",
        region="West Texas / SE New Mexico",
        states=["TX", "NM"],
        lat_range=(31.0, 33.0),
        lon_range=(-104.0, -101.0),
        station_count=45,
        compressors_per_station=(8, 25),
        avg_elevation_ft=2800,
        timezone="America/Chicago",
    ),
    Basin(
        name="Eagle Ford",
        region="South Texas",
        states=["TX"],
        lat_range=(28.0, 29.5),
        lon_range=(-99.5, -97.0),
        station_count=30,
        compressors_per_station=(6, 20),
        avg_elevation_ft=450,
        timezone="America/Chicago",
    ),
    Basin(
        name="Haynesville",
        region="East Texas / NW Louisiana",
        states=["TX", "LA"],
        lat_range=(31.5, 33.0),
        lon_range=(-94.5, -93.0),
        station_count=20,
        compressors_per_station=(5, 18),
        avg_elevation_ft=350,
        timezone="America/Chicago",
    ),
    Basin(
        name="Marcellus",
        region="Appalachia",
        states=["PA", "WV", "OH"],
        lat_range=(39.0, 42.0),
        lon_range=(-81.0, -76.0),
        station_count=25,
        compressors_per_station=(4, 15),
        avg_elevation_ft=1200,
        timezone="America/New_York",
    ),
    Basin(
        name="SCOOP/STACK",
        region="Oklahoma",
        states=["OK"],
        lat_range=(34.5, 36.5),
        lon_range=(-99.0, -97.0),
        station_count=20,
        compressors_per_station=(5, 16),
        avg_elevation_ft=1400,
        timezone="America/Chicago",
    ),
    Basin(
        name="Utica",
        region="Ohio / West Virginia",
        states=["OH", "WV"],
        lat_range=(39.5, 41.0),
        lon_range=(-82.0, -80.0),
        station_count=15,
        compressors_per_station=(4, 12),
        avg_elevation_ft=900,
        timezone="America/New_York",
    ),
    Basin(
        name="DJ Basin",
        region="Colorado / Wyoming",
        states=["CO", "WY"],
        lat_range=(39.5, 41.5),
        lon_range=(-105.5, -104.0),
        station_count=12,
        compressors_per_station=(4, 14),
        avg_elevation_ft=5200,
        timezone="America/Denver",
    ),
    Basin(
        name="San Juan",
        region="NW New Mexico / SW Colorado",
        states=["NM", "CO"],
        lat_range=(36.0, 37.5),
        lon_range=(-109.0, -107.0),
        station_count=10,
        compressors_per_station=(3, 10),
        avg_elevation_ft=5800,
        timezone="America/Denver",
    ),
    Basin(
        name="Barnett",
        region="North Texas",
        states=["TX"],
        lat_range=(32.0, 33.5),
        lon_range=(-98.0, -96.5),
        station_count=12,
        compressors_per_station=(4, 12),
        avg_elevation_ft=650,
        timezone="America/Chicago",
    ),
    Basin(
        name="Bakken",
        region="North Dakota / Montana",
        states=["ND", "MT"],
        lat_range=(47.0, 49.0),
        lon_range=(-104.5, -102.5),
        station_count=8,
        compressors_per_station=(3, 10),
        avg_elevation_ft=2100,
        timezone="America/Chicago",
    ),
]


def select_compressor_model(rng: random.Random) -> CompressorModel:
    """Select a compressor model weighted by fleet distribution."""
    weights = [m.weight_in_fleet for m in COMPRESSOR_MODELS]
    return rng.choices(COMPRESSOR_MODELS, weights=weights, k=1)[0]


def generate_station_id(basin_name: str, station_idx: int) -> str:
    """Generate a station ID from basin name and index.

    Example: 'PERM-045', 'EGLF-012', 'MARC-003'
    """
    basin_codes = {
        "Permian Basin": "PERM",
        "Eagle Ford": "EGLF",
        "Haynesville": "HAYN",
        "Marcellus": "MARC",
        "SCOOP/STACK": "SCST",
        "Utica": "UTIC",
        "DJ Basin": "DJBS",
        "San Juan": "SNJN",
        "Barnett": "BARN",
        "Bakken": "BAKK",
    }
    code = basin_codes.get(basin_name, "UNKN")
    return f"{code}-{station_idx:03d}"


def generate_compressor_id(global_idx: int) -> str:
    """Generate a compressor ID. Format: COMP-XXXX (4 digits for 4,700+ units)."""
    return f"COMP-{global_idx:04d}"

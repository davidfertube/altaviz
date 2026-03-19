"""
Event Hub Producer — Stream Compressor Telemetry to Azure Event Hubs

Simulates IoT device ingestion at production scale:
- 4,700 compressors sending telemetry every 5 minutes
- ~16 messages/second sustained throughput
- Avro-serialized messages with schema validation
- Partitioned by basin for ordered processing

In production, this would be replaced by:
- Azure IoT Hub (device management + ingestion)
- Detechtion IIoT gateway (Archrock's system)
- MQTT → IoT Hub → Event Hubs routing

Author: David Fernandez
"""

# ===========================================================================
# PATTERN: Basin-to-Partition Mapping (Data Locality)
# WHY: Event Hubs has 16 partitions. We map 10 basins to specific
#      partition IDs so that all data from a given basin lands in the
#      same partition. This provides two benefits:
#      1. Ordered processing: Within a partition, messages are strictly
#         ordered by sequence number. This means readings from the same
#         basin arrive in chronological order — important for time-series
#         analysis and watermark computation.
#      2. Data locality: When Spark reads from Event Hubs, each Spark
#         partition maps to one Event Hub partition. Basin-grouped data
#         means each Spark task processes one geographic region, which
#         improves cache efficiency and reduces cross-partition joins.
#      With 10 basins and 16 partitions, 6 partitions are unused
#      (reserved for future basin expansion or load balancing).
# SCALING: Throughput math: 4,700 compressors x 12 readings/hour =
#          56,400 messages/hour = ~16 messages/second. A single Event
#          Hub throughput unit handles 1,000 messages/second, so we are
#          well within capacity. The Permian Basin (~30% of fleet) gets
#          the most traffic (~5 msg/sec on partition 0).
# ALTERNATIVE: Could use round-robin partitioning (better load balance)
#              but that loses ordering guarantees and data locality.
# ===========================================================================

# ===========================================================================
# PATTERN: Avro Serialization at Ingestion Boundary
# WHY: Messages are serialized as JSON (not Avro) in this implementation
#      for simplicity, but the schema_registry.py module validates against
#      an Avro schema. In production, you would use Azure Schema Registry
#      with binary Avro encoding for:
#      1. Smaller message size (Avro is ~40% smaller than JSON)
#      2. Schema enforcement (reject messages that do not match the
#         registered schema before they enter Event Hubs)
#      3. Schema evolution (add fields without breaking consumers)
#      The current JSON approach works for development and small fleets
#      but would add ~40% bandwidth overhead at full fleet scale.
# ===========================================================================

import json
import logging
import os
import time
from typing import List, Dict, TYPE_CHECKING

if TYPE_CHECKING:
    from src.data_simulator.fleet_simulator import FleetSimulator

logger = logging.getLogger(__name__)

# Basin-to-partition mapping (16 Event Hub partitions).
# 10 basins mapped to partitions 0-9, leaving partitions 10-15 unused
# (reserved for future basins or special routing like dead letter).
BASIN_PARTITION_MAP = {
    "Permian Basin": "0",
    "Eagle Ford": "1",
    "Haynesville": "2",
    "Marcellus": "3",
    "SCOOP/STACK": "4",
    "Utica": "5",
    "DJ Basin": "6",
    "San Juan": "7",
    "Barnett": "8",
    "Bakken": "9",
}


def create_event_hub_client():
    """
    Create an Event Hub producer client from connection string.

    Requires:
        EVENTHUB_CONNECTION_STRING: Full connection string with EntityPath
        or
        EVENTHUB_NAMESPACE + EVENTHUB_NAME: Separate components
    """
    try:
        from azure.eventhub import EventHubProducerClient
    except ImportError:
        raise ImportError(
            "azure-eventhub package required. Install with: "
            "pip install azure-eventhub"
        )

    conn_str = os.environ.get('EVENTHUB_CONNECTION_STRING')
    if conn_str:
        return EventHubProducerClient.from_connection_string(conn_str)

    # Fall back to namespace + name
    namespace = os.environ.get('EVENTHUB_NAMESPACE')
    hub_name = os.environ.get('EVENTHUB_NAME', 'compressor-telemetry')

    if not namespace:
        raise ValueError(
            "Set EVENTHUB_CONNECTION_STRING or EVENTHUB_NAMESPACE environment variable"
        )

    from azure.identity import DefaultAzureCredential
    credential = DefaultAzureCredential()
    return EventHubProducerClient(
        fully_qualified_namespace=f"{namespace}.servicebus.windows.net",
        eventhub_name=hub_name,
        credential=credential,
    )


def send_batch(client, messages: List[Dict], partition_key: str = None):
    """
    Send a batch of messages to Event Hubs.

    Args:
        client: EventHubProducerClient
        messages: List of sensor reading dicts
        partition_key: Optional partition key (basin name)
    """
    from azure.eventhub import EventData

    event_data_batch = client.create_batch(partition_key=partition_key)

    for msg in messages:
        event = EventData(json.dumps(msg).encode('utf-8'))
        # Event properties are metadata attached to each message without
        # being part of the message body. Consumers can filter on these
        # properties without deserializing the full JSON payload — useful
        # for routing, monitoring, and dead letter classification.
        event.properties = {
            b'compressor_id': msg['compressor_id'].encode('utf-8'),
            b'basin': msg.get('basin', 'unknown').encode('utf-8'),
            b'source': b'fleet_simulator',
        }

        try:
            event_data_batch.add(event)
        except ValueError:
            # Batch is full, send and start new one
            client.send_batch(event_data_batch)
            event_data_batch = client.create_batch(partition_key=partition_key)
            event_data_batch.add(event)

    if len(event_data_batch) > 0:
        client.send_batch(event_data_batch)

    return len(messages)


def stream_to_event_hubs(simulator: "FleetSimulator"):
    """
    Stream fleet simulator output to Azure Event Hubs.

    Groups messages by basin for partition-key routing.
    Rate-limits to avoid overwhelming Event Hubs throughput units.

    Args:
        simulator: FleetSimulator instance
    """
    client = create_event_hub_client()
    total_sent = 0
    start_time = time.time()

    try:
        for message_batch in simulator.generate_event_messages(batch_size=200):
            # Group by basin for partition routing
            basin_groups: Dict[str, List[Dict]] = {}
            for msg in message_batch:
                basin = msg.get('basin', 'unknown')
                basin_groups.setdefault(basin, []).append(msg)

            for basin, basin_messages in basin_groups.items():
                partition_key = BASIN_PARTITION_MAP.get(basin, None)
                sent = send_batch(client, basin_messages, partition_key)
                total_sent += sent

            elapsed = time.time() - start_time
            rate = total_sent / elapsed if elapsed > 0 else 0
            logger.info(f"Sent {total_sent:,} messages ({rate:.0f} msg/sec)")

            # Rate limit: ~1,000 msg/sec max per throughput unit.
            # We throttle at 800 msg/sec (80% of capacity) to leave
            # headroom for burst traffic and avoid Event Hubs throttling
            # errors (HTTP 429). At 4,700 compressors, sustained rate is
            # only ~16 msg/sec, so this limit is rarely hit during normal
            # operation — it is a safety valve for batch backfill scenarios.
            if rate > 800:
                time.sleep(0.1)

    finally:
        client.close()

    elapsed = time.time() - start_time
    logger.info(
        f"Streaming complete: {total_sent:,} messages in {elapsed:.1f}s "
        f"({total_sent/elapsed:.0f} msg/sec)"
    )


def stream_to_local_files(simulator: "FleetSimulator", output_dir: str = "data/raw/events"):
    """
    Write Event Hub messages to local JSON files (for testing without Azure).

    Simulates Event Hubs capture format (JSON lines per partition).
    """
    from pathlib import Path
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    partition_files = {}
    total = 0

    try:
        for message_batch in simulator.generate_event_messages(batch_size=200):
            for msg in message_batch:
                basin = msg.get('basin', 'unknown')
                partition = BASIN_PARTITION_MAP.get(basin, '15')

                if partition not in partition_files:
                    fpath = output_path / f'partition_{partition}.jsonl'
                    partition_files[partition] = open(fpath, 'a')

                partition_files[partition].write(json.dumps(msg) + '\n')
                total += 1

            if total % 100000 == 0:
                logger.info(f"Written {total:,} messages to local files")
    finally:
        for f in partition_files.values():
            f.close()

    logger.info(f"Local capture complete: {total:,} messages across {len(partition_files)} partitions")

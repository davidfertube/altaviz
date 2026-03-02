"""Unit tests for ID generator."""
import pytest
from unittest.mock import patch
from datetime import datetime

from src.agents.shared.id_generator import (
    generate_work_order_id,
    generate_investigation_id,
    generate_recommendation_id,
    generate_snapshot_id,
)


class TestIdGenerator:
    @patch('src.agents.shared.id_generator._get_next_sequence')
    def test_work_order_id_format(self, mock_seq):
        mock_seq.return_value = 42
        result = generate_work_order_id()
        year = datetime.utcnow().year
        assert result == f'WO-{year}-00042'

    @patch('src.agents.shared.id_generator._get_next_sequence')
    def test_investigation_id_format(self, mock_seq):
        mock_seq.return_value = 1
        result = generate_investigation_id()
        year = datetime.utcnow().year
        assert result == f'INV-{year}-00001'

    @patch('src.agents.shared.id_generator._get_next_sequence')
    def test_recommendation_id_format(self, mock_seq):
        mock_seq.return_value = 999
        result = generate_recommendation_id()
        year = datetime.utcnow().year
        assert result == f'OPT-{year}-00999'

    def test_snapshot_id_format(self):
        result = generate_snapshot_id('daily')
        date_str = datetime.utcnow().strftime('%Y-%m-%d')
        assert result == f'SNAP-{date_str}-daily'

    def test_snapshot_id_hourly(self):
        result = generate_snapshot_id('hourly')
        assert '-hourly' in result

    @patch('src.agents.shared.id_generator._get_next_sequence')
    def test_sequence_zero_padding(self, mock_seq):
        mock_seq.return_value = 7
        result = generate_work_order_id()
        assert '-00007' in result

    @patch('src.agents.shared.id_generator._get_next_sequence')
    def test_large_sequence_number(self, mock_seq):
        mock_seq.return_value = 12345
        result = generate_work_order_id()
        assert '-12345' in result

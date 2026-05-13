import pytest
from backend.utils.hash_utils import calculate_file_hash

def test_calculate_file_hash_consistency():
    content = b"test educational content"
    hash1 = calculate_file_hash(content)
    hash2 = calculate_file_hash(content)
    assert hash1 == hash2
    assert len(hash1) == 64

def test_calculate_file_hash_uniqueness():
    assert calculate_file_hash(b"content a") != calculate_file_hash(b"content b")

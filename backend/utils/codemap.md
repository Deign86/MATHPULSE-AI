# backend/utils/

## Responsibility
Contains shared low-level utility functions; currently `hash_utils.py` provides deterministic file-content hashing.

## Design
- Stateless standard-library helper `calculate_file_hash(content: bytes) -> str` computes SHA-256 and returns a lowercase hexadecimal digest.
- No I/O, external dependency, configuration, or mutable state.

## Flow
Caller supplies complete file bytes → `hashlib.sha256(content).hexdigest()` → caller uses digest for identity/deduplication.

## Integration
Imported as `utils.hash_utils.calculate_file_hash`; `backend/tests/test_hash_utils.py` covers the helper. No Firestore collection or service dependency is defined in this folder.

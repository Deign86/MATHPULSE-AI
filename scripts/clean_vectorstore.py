import chromadb
from collections import Counter

client = chromadb.PersistentClient(path='datasets/vectorstore')
collection = client.get_collection('curriculum_chunks')
count = collection.count()
print(f'Total chunks: {count}')

# Get all chunks and check which ones belong to removed PDFs
results = collection.get()

print("\nSample chunks:")
for i, doc_id in enumerate(results['ids'][:10]):
    meta = results['metadatas'][i]
    print(f'  {doc_id}: {meta.get("subject", "unknown")}')

print("\nChunks per subject:")
subjects = Counter(m.get('subject', 'unknown') for m in results['metadatas'])
for subject, count in subjects.most_common():
    print(f'  {subject}: {count}')

print("\nNo subject-specific deletion performed; the SSHS corpus is the source of truth.")
print(f"\nRemaining chunks: {collection.count()}")

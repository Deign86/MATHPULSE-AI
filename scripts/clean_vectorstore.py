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

# Delete chunks from removed PDFs
removed_subjects = ['Finite Mathematics 1', 'Finite Mathematics 2', 'Organization and Management']
for subject in removed_subjects:
    ids_to_delete = []
    for i, meta in enumerate(results['metadatas']):
        if meta.get('subject') == subject:
            ids_to_delete.append(results['ids'][i])
    
    if ids_to_delete:
        print(f"\nDeleting {len(ids_to_delete)} chunks from {subject}...")
        collection.delete(ids=ids_to_delete)
    else:
        print(f"\nNo chunks found for {subject}")

print(f"\nRemaining chunks: {collection.count()}")

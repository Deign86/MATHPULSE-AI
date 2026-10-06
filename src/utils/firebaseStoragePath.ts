export function isValidFirebaseStoragePdfPath(path: string): boolean {
  const trimmedPath = path.trim();
  if (!trimmedPath || trimmedPath.startsWith('/') || trimmedPath.includes('\\')) return false;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmedPath)) return false;
  // Backend ingestion only serves the quiz_pdfs/ prefix (quiz_battle.py validator).
  if (!trimmedPath.startsWith('quiz_pdfs/')) return false;
  const pathSegments = trimmedPath.split('/');
  return pathSegments.every((segment) => segment !== '' && segment !== '.' && segment !== '..')
    && trimmedPath.toLowerCase().endsWith('.pdf');
}

from huggingface_hub import HfApi
api = HfApi()
repo = 'Deign86/mathpulse-api'
info = api.repo_info(repo_id=repo, repo_type='space')
print('SHA:', info.sha)
print('LAST_MODIFIED:', info.last_modified)
rt = api.get_space_runtime(repo)
print('RUNTIME_STAGE:', getattr(rt, 'stage', None))
print('RUNTIME_SHA:', rt.raw.get('sha'))
print('LATEST_COMMITS:')
for c in api.list_repo_commits(repo_id=repo, repo_type='space')[:5]:
    print('-', c.commit_id[:12], c.created_at, c.title)

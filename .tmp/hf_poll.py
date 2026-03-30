import time
from huggingface_hub import HfApi
api = HfApi()
repo = 'Deign86/mathpulse-api'
for i in range(15):
    rt = api.get_space_runtime(repo)
    info = api.repo_info(repo_id=repo, repo_type='space')
    stage = getattr(rt, 'stage', None)
    runtime_sha = rt.raw.get('sha') if hasattr(rt, 'raw') else None
    head_sha = info.sha
    print(f'POLL {i+1}: stage={stage} runtime_sha={runtime_sha} head_sha={head_sha}')
    if runtime_sha == head_sha and str(stage).upper().startswith('RUNNING') and 'BUILDING' not in str(stage).upper():
        break
    time.sleep(10)

from huggingface_hub import HfApi
api=HfApi()
repo='Deign86/mathpulse-ai'
rt=api.get_space_runtime(repo)
info=api.repo_info(repo_id=repo, repo_type='space')
print('stage', rt.stage)
print('sha', info.sha)
print('card', info.card_data)

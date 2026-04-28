This Figma Make file includes components from [shadcn/ui](https://ui.shadcn.com/) used under [MIT license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).

This Figma Make file includes photos from [Unsplash](https://unsplash.com) used under [license](https://unsplash.com/license).

## AI Monitoring Data Source

The AI Platform Monitoring dashboard integrates with the **Hugging Face Inference API** as its primary source of truth for AI health metrics. Real-time data is fetched from the following HF API endpoints:

- **Billing & Usage** — `GET https://huggingface.co/api/billing/usage`
- **Model Status** — `GET https://api-inference.huggingface.co/models/{model_id}`
- **Latency Probe** — `POST https://api-inference.huggingface.co/models/{model_id}` (minimal payload)

All API calls are routed through the backend proxy (`/api/hf/monitoring`) to keep the HF token server-side. The monitored model is `Qwen/Qwen3-32B` under the `Deign86` Hugging Face account.
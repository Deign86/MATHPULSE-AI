# Frontend - Backend API Call Chain Analysis

## Request Flow for Chat

### 1. Frontend: AIChatPage.tsx
- **Location:** `src/components/AIChatPage.tsx`
- **Action:** User sends chat message via `handleSendMessage()`
- **Calls:** `sendMessage(sessionId, text)`

### 2. Frontend: ChatContext.tsx - sendMessage()
- **Location:** `src/contexts/ChatContext.tsx` (line 351)
- **Action:** 
  - Builds message history from current session
  - Calls `apiService.chatSafe(userText, history)`
- **Code:**
  ```typescript
  const { data, fromFallback } = await apiService.chatSafe(
    userText.trim(), 
    history
  );
  ```

### 3. Frontend: apiService.ts - chatSafe()
- **Location:** `src/services/apiService.ts` (line 1043)
- **Action:** Wraps the chat call with error fallback handling
- **Calls:** `apiService.chat(message, history)`
- **Code:**
  ```typescript
  async chatSafe(message, history) {
    return withFallback(
      () => apiService.chat(message, history),
      FALLBACK_CHAT,
      'chat'
    );
  }
  ```

### 4. Frontend: apiService.ts - chat()
- **Location:** `src/services/apiService.ts` (line 1029)
- **Action:** Makes HTTP POST request to backend `/api/chat` endpoint
- **Endpoint:** `POST /api/chat`
- **API_URL:** `VITE_API_URL` (default: `https://deign86-mathpulse-api-v3test.hf.space`)
- **Request Body:**
  ```json
  {
    "message": "user message text",
    "history": [
      { "role": "user", "content": "..." },
      { "role": "assistant", "content": "..." }
    ]
  }
  ```
- **Code:**
  ```typescript
  async chat(message, history) {
    return apiFetch<ChatResponse>(
      '/api/chat',
      { method: 'POST', body: JSON.stringify({ message, history }) },
      AI_RETRY_OPTS
    );
  }
  ```

## Backend: /api/chat Endpoint

### 5. Backend: main.py - chat_tutor()
- **Location:** `backend/main.py` (line 1177)
- **Endpoint:** `POST /api/chat`
- **Action:**
  1. Receives ChatRequest with message and history
  2. Builds messages list with system prompt + conversation history
  3. Calls `call_hf_chat(messages, task_type="chat")`
- **Code:**
  ```python
  @app.post("/api/chat", response_model=ChatResponse)
  async def chat_tutor(request: ChatRequest):
    messages = [{"role": "system", "content": MATH_TUTOR_SYSTEM_PROMPT}]
    for msg in request.history[-10:]:
      messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})
    
    answer = call_hf_chat(
      messages, 
      max_tokens=1024, 
      temperature=0.3, 
      top_p=0.9, 
      task_type="chat"
    )
    return ChatResponse(response=answer)
  ```

### 6. Backend: main.py - call_hf_chat()
- **Location:** `backend/main.py` (line 964)
- **Action:**
  1. Creates InferenceRequest with task_type="chat"
  2. Calls `get_inference_client().generate_from_messages(req)`
- **Code:**
  ```python
  def call_hf_chat(messages, ..., task_type="default", ...):
    req = InferenceRequest(
      messages=messages,
      task_type=task_type,
      max_new_tokens=1024,
      temperature=0.3,
      top_p=0.9,
      timeout_sec=90
    )
    text = get_inference_client().generate_from_messages(req)
    return _strip_repetition(text)
  ```

### 7. Backend: InferenceClient - generate_from_messages()
- **Location:** `backend/services/inference_client.py`
- **Action:**
  1. Takes InferenceRequest with task_type="chat"
  2. Looks up model in config/models.yaml using task_type
  3. Model fetched: `Qwen/Qwen2.5-Math-7B-Instruct:featherless-ai`
  4. Extracts provider suffix "featherless-ai" from model string
  5. Sends request to HF Inference API: `https://router.huggingface.co/v1/chat/completions`
  6. Full model string sent: `Qwen/Qwen2.5-Math-7B-Instruct:featherless-ai`
- **Provider routing:** HF router recognizes `:featherless-ai` suffix and routes to Featherless AI

### 8. HF Inference API Router
- **Endpoint:** `https://router.huggingface.co/v1/chat/completions`
- **Model:** `Qwen/Qwen2.5-Math-7B-Instruct:featherless-ai`
- **Provider:** Featherless AI
- **Billing:** On user's HF account

## Response Flow (Return Path)

```
HF Inference API (Featherless AI)
        ↓
InferenceClient (returns model response)
        ↓
call_hf_chat() (strips repetition, returns string)
        ↓
/api/chat endpoint (wraps in ChatResponse)
        ↓
apiService.chat() (parses JSON response)
        ↓
apiService.chatSafe() (returns { data, fromFallback: false })
        ↓
ChatContext.sendMessage() (adds AI message to session)
        ↓
AIChatPage (displays response to user)
```

## Configuration Status

✅ **Frontend API calls:** Correct
- Frontend is calling `/api/chat` with message and history

✅ **Backend endpoint:** Correct
- `/api/chat` endpoint exists and routes to proper handler

✅ **Backend passes task_type:** Correct
- Backend passes `task_type="chat"` to InferenceClient

✅ **Inference client configuration:** Correct
- Config loaded from `config/models.yaml`
- Model for "chat" task: `Qwen/Qwen2.5-Math-7B-Instruct:featherless-ai`
- Provider suffix preserved through API call

✅ **HF Inference API endpoint:** Correct
- URL: `https://router.huggingface.co/v1/chat/completions`
- Full model string with provider suffix sent

## Test Results

✅ **Local test passed:** Chat request "What is 2+2?" succeeded
- Response: "The answer to 2+2 is 4."
- Latency: 3.6 seconds
- Provider: featherless-ai via HF router
- Status: ok

## Conclusion

The entire API call chain is correctly wired for Featherless AI provider routing through HF Inference API with proper billing on the user's HF account.

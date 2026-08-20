import json
from config import (
    LLM_PROVIDER, LLM_MODEL, DEEPSEEK_API_KEY, GEMINI_API_KEY,
    GROQ_API_KEY, OPENAI_API_KEY, OLLAMA_BASE_URL, SYSTEM_PROMPT
)
from tools import TOOL_CHECK_PBG_STATUS, TOOL_CHECK_DOCUMENT_VAULT, TOOL_REGISTRY
from rag_retriever import query_rag_syarat

ALL_OPENAI_TOOLS = [TOOL_CHECK_PBG_STATUS, TOOL_CHECK_DOCUMENT_VAULT]

def generate_chat_response(user_message: str, history: list = None) -> str:
    """
    Unified Model-Agnostic Engine supporting DeepSeek, Gemini, Groq, OpenAI, and Ollama.
    Handles RAG context injection and Tool Calling automatically.
    """
    if history is None:
        history = []

    # 1. Fetch relevant RAG context from ChromaDB
    rag_context = query_rag_syarat(user_message)
    full_system_prompt = SYSTEM_PROMPT
    if rag_context:
        full_system_prompt += f"\n\n{rag_context}"

    # 2. Check provider selection
    provider = LLM_PROVIDER.lower()

    if provider == "gemini":
        return _call_gemini(user_message, history, full_system_prompt)
    else:
        # DeepSeek, Groq, OpenAI, Ollama all use OpenAI-compatible API format!
        return _call_openai_compatible(user_message, history, full_system_prompt, provider)

def _call_openai_compatible(user_message: str, history: list, system_prompt: str, provider: str) -> str:
    """Executes call using standard OpenAI API format (supported by DeepSeek, Groq, OpenAI, Ollama)."""
    try:
        from openai import OpenAI
    except ImportError:
        return "Error: package 'openai' is not installed. Please run pip install openai."

    # Set base URL and API key according to provider
    if provider == "deepseek":
        api_key = DEEPSEEK_API_KEY or "dummy_key"
        base_url = "https://api.deepseek.com"
        model_name = LLM_MODEL if LLM_MODEL != "gemini-3.1-flash-lite" else "deepseek-chat"
    elif provider == "groq":
        api_key = GROQ_API_KEY or "dummy_key"
        base_url = "https://api.groq.com/openai/v1"
        model_name = LLM_MODEL if LLM_MODEL != "gemini-3.1-flash-lite" else "llama-3.3-70b-versatile"
    elif provider == "ollama":
        api_key = "ollama"
        base_url = OLLAMA_BASE_URL
        model_name = LLM_MODEL if LLM_MODEL != "gemini-3.1-flash-lite" else "qwen2.5:7b"
    else: # openai default
        api_key = OPENAI_API_KEY or "dummy_key"
        base_url = "https://api.openai.com/v1"
        model_name = LLM_MODEL if LLM_MODEL != "gemini-3.1-flash-lite" else "gpt-4o-mini"

    client = OpenAI(api_key=api_key, base_url=base_url)

    # Build messages array
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            tools=ALL_OPENAI_TOOLS,
            tool_choice="auto"
        )
        
        choice = response.choices[0]
        msg = choice.message

        # Handle tool calls if requested by model
        if msg.tool_calls:
            messages.append(msg)
            for tool_call in msg.tool_calls:
                func_name = tool_call.function.name
                func_args = json.loads(tool_call.function.arguments)

                if func_name in TOOL_REGISTRY:
                    tool_result = TOOL_REGISTRY[func_name](**func_args)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": tool_result
                    })

            second_response = client.chat.completions.create(
                model=model_name,
                messages=messages
            )
            return second_response.choices[0].message.content

        return msg.content or ""

    except Exception as exc:
        return f"Mohon maaf, terjadi kendala koneksi ke layanan AI ({provider}): {exc}"

def _call_gemini(user_message: str, history: list, system_prompt: str) -> str:
    """Executes call using Google GenAI SDK."""
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        return "Error: package 'google-genai' is not installed."

    if not GEMINI_API_KEY:
        return "Error: GEMINI_API_KEY is not configured in .env file."

    client = genai.Client(api_key=GEMINI_API_KEY)
    model_name = LLM_MODEL if LLM_MODEL.startswith("gemini") else "gemini-2.5-flash"

    # Define Gemini tool schema
    gemini_tools = types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="check_pbg_status",
                description="Memeriksa status real-time permohonan PBG dari database berdasarkan nomor registrasi.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "registration_id": types.Schema(
                            type=types.Type.STRING,
                            description="Nomor registrasi (contoh: '6680', '2845')."
                        )
                    },
                    required=["registration_id"]
                )
            ),
            types.FunctionDeclaration(
                name="check_document_vault",
                description="Melihat dan mengunduh berkas lampiran, denah/gambar arsitektur, atau SK PBG dari brangkas penyimpanan.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "registration_id": types.Schema(
                            type=types.Type.STRING,
                            description="Nomor registrasi berkas (contoh: '6680', '2845')."
                        )
                    },
                    required=["registration_id"]
                )
            )
        ]
    )

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=[gemini_tools]
            )
        )

        if response.function_calls:
            fc = response.function_calls[0]
            func_name = fc.name
            func_args = dict(fc.args)

            if func_name in TOOL_REGISTRY:
                tool_result_str = TOOL_REGISTRY[func_name](**func_args)
                
                followup = client.models.generate_content(
                    model=model_name,
                    contents=[
                        user_message,
                        response.candidates[0].content,
                        types.Part.from_function_response(
                            name=func_name,
                            response={"result": tool_result_str}
                        )
                    ],
                    config=types.GenerateContentConfig(system_instruction=system_prompt)
                )
                return followup.text

        return response.text or ""

    except Exception as exc:
        return f"Mohon maaf, terjadi kendala saat menghubungkan ke Gemini API: {exc}"

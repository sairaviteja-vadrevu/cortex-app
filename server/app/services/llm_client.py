from __future__ import annotations

import json
import re
import logging
from dataclasses import dataclass
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from ..config import settings
from ..models.enums import LLMProvider, DEFAULT_MODELS, AVAILABLE_MODELS

logger = logging.getLogger(__name__)


@dataclass
class LLMResponse:
    """LLM call result with token usage metadata."""
    text: str
    input_tokens: int = 0
    output_tokens: int = 0


def _strip_fences(text: str) -> str:
    """Remove markdown code fences and trim whitespace."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def _make_retry(max_retries: int):
    """Create a tenacity retry decorator."""
    return retry(
        stop=stop_after_attempt(max_retries),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((Exception,)),
        reraise=True,
    )


async def call_anthropic(model: str, system_prompt: str, user_prompt: str, max_tokens: int, timeout: int) -> LLMResponse:
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    @_make_retry(settings.llm_max_retries)
    async def _call():
        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            timeout=timeout,
        )
        return LLMResponse(
            text=response.content[0].text,
            input_tokens=getattr(response.usage, 'input_tokens', 0),
            output_tokens=getattr(response.usage, 'output_tokens', 0),
        )

    resp = await _call()
    resp.text = _strip_fences(resp.text)
    return resp


async def call_openai(model: str, system_prompt: str, user_prompt: str, max_tokens: int, timeout: int) -> LLMResponse:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    @_make_retry(settings.llm_max_retries)
    async def _call():
        response = await client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            timeout=timeout,
        )
        usage = response.usage
        return LLMResponse(
            text=response.choices[0].message.content,
            input_tokens=getattr(usage, 'prompt_tokens', 0) if usage else 0,
            output_tokens=getattr(usage, 'completion_tokens', 0) if usage else 0,
        )

    resp = await _call()
    resp.text = _strip_fences(resp.text)
    return resp


async def call_google(model: str, system_prompt: str, user_prompt: str, max_tokens: int, timeout: int) -> LLMResponse:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.google_api_key)

    @_make_retry(settings.llm_max_retries)
    async def _call():
        response = await client.aio.models.generate_content(
            model=model,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                max_output_tokens=max_tokens,
            ),
        )
        meta = getattr(response, 'usage_metadata', None)
        return LLMResponse(
            text=response.text,
            input_tokens=getattr(meta, 'prompt_token_count', 0) if meta else 0,
            output_tokens=getattr(meta, 'candidates_token_count', 0) if meta else 0,
        )

    resp = await _call()
    resp.text = _strip_fences(resp.text)
    return resp


async def call_llm(
    provider: LLMProvider,
    model: str | None,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 16000,
    timeout: int = 120,
) -> LLMResponse:
    """Route LLM call to the correct provider. Returns LLMResponse with text + token usage."""
    # Default model if none specified
    if model is None:
        model = DEFAULT_MODELS[provider]

    # Validate model
    if model not in AVAILABLE_MODELS[provider]:
        raise ValueError(f"Model '{model}' not available for {provider.value}. Available: {AVAILABLE_MODELS[provider]}")

    logger.info(f"LLM call: provider={provider.value}, model={model}")

    if provider == LLMProvider.ANTHROPIC:
        return await call_anthropic(model, system_prompt, user_prompt, max_tokens, timeout)
    elif provider == LLMProvider.OPENAI:
        return await call_openai(model, system_prompt, user_prompt, max_tokens, timeout)
    elif provider == LLMProvider.GOOGLE:
        return await call_google(model, system_prompt, user_prompt, max_tokens, timeout)
    else:
        raise ValueError(f"Unknown provider: {provider}")


def _try_repair_json(text: str) -> str:
    """Attempt to repair truncated JSON by closing open brackets/braces."""
    # Track nesting
    in_string = False
    escape = False
    stack = []
    for ch in text:
        if escape:
            escape = False
            continue
        if ch == '\\' and in_string:
            escape = True
            continue
        if ch == '"' and not escape:
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in ('{', '['):
            stack.append(ch)
        elif ch == '}' and stack and stack[-1] == '{':
            stack.pop()
        elif ch == ']' and stack and stack[-1] == '[':
            stack.pop()

    # If we're inside an unterminated string, close it
    if in_string:
        text += '"'

    # Close any remaining open brackets/braces
    for opener in reversed(stack):
        text += ']' if opener == '[' else '}'

    return text


def _sanitize_json_strings(text: str) -> str:
    """Escape invalid control characters inside JSON string values.

    LLMs often put literal newlines, tabs, and other control chars inside
    JSON strings which is invalid per the spec. This walks the text and
    replaces unescaped control chars (0x00-0x1F) within strings with their
    proper escape sequences.
    """
    result = []
    in_string = False
    escape = False
    for ch in text:
        if escape:
            result.append(ch)
            escape = False
            continue
        if ch == '\\' and in_string:
            result.append(ch)
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            result.append(ch)
            continue
        if in_string and ord(ch) < 0x20:
            # Replace control characters with their JSON escape sequences
            _CONTROL_MAP = {
                '\n': '\\n',
                '\r': '\\r',
                '\t': '\\t',
                '\b': '\\b',
                '\f': '\\f',
            }
            result.append(_CONTROL_MAP.get(ch, f'\\u{ord(ch):04x}'))
        else:
            result.append(ch)
    return ''.join(result)


def parse_llm_json(text: str) -> dict:
    """Parse LLM output as JSON, stripping fences if needed."""
    cleaned = _strip_fences(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Sanitize control characters and retry
        sanitized = _sanitize_json_strings(cleaned)
        try:
            return json.loads(sanitized)
        except json.JSONDecodeError:
            pass
        # Try to repair truncated JSON
        try:
            repaired = _try_repair_json(sanitized)
            return json.loads(repaired)
        except json.JSONDecodeError as e2:
            raise ValueError(f"Failed to parse LLM JSON: {e2}\nFirst 500 chars: {cleaned[:500]}")

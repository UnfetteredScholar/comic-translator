import base64
import json
import re

import requests


class Translator:
    def __init__(
        self, model: str, api_key: str, base_url: str = "http://localhost:8080"
    ):
        """
        Initializes the Translator class

        Args:
            model: The model to use for translation
            api_key: The API key to use for the translation model
        """
        self.base_url = base_url
        self.model = model
        self.api_key = api_key

    def _encode_image(self, path: str) -> str:
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode()

    def _encode_image_bytes(self, image_data: bytes) -> str:
        return base64.b64encode(image_data).decode()

    def _estimate_tokens(self, text: str) -> int:
        """
        Rough but effective token estimator for LLM batching.
        (Works well enough for scheduling batches without a tokenizer)
        """
        # heuristic: 1 token ≈ 4 chars (English-heavy workloads)
        return max(1, len(text) // 4)

    def _split_into_batches_for_translation(
        self,
        texts: list[str],
        ctx_size: int = 8192,
        safety_ratio: float = 0.7,
        avg_output_tokens_per_item: int = 25,
        max_batch_size: int = 32,
        min_batch_size: int = 4,
    ) -> list[list[str]]:
        """
        Splits a list of strings into optimal batches for LLM translation.

        Optimizes for:
        - stable GPU throughput
        - minimal KV-cache slowdown
        - llama.cpp context pressure
        """

        usable_ctx = int(ctx_size * safety_ratio)

        batches = []
        current_batch = []
        current_tokens = 0

        for text in texts:
            input_tokens = self._estimate_tokens(text)
            total_item_cost = input_tokens + avg_output_tokens_per_item

            # If a single item is too large, force it alone
            if total_item_cost > usable_ctx:
                if current_batch:
                    batches.append(current_batch)
                    current_batch = []
                    current_tokens = 0
                batches.append([text])
                continue

            # If adding this item exceeds budget → flush batch
            if (
                current_tokens + total_item_cost > usable_ctx
                or len(current_batch) >= max_batch_size
            ):
                if len(current_batch) >= min_batch_size:
                    batches.append(current_batch)
                    current_batch = []
                    current_tokens = 0

            current_batch.append(text)
            current_tokens += total_item_cost

        if current_batch:
            batches.append(current_batch)

        return batches

    def translate_text(self, text: str, target_language: str = "en") -> str:
        """
        Translates text using the translation model
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        json = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "/no_think",
                            "text": text,
                        },
                        {
                            "type": "text",
                            "text": f"Translate the text to {target_language}: {text}",
                        },
                    ],
                }
            ],
            "temperature": 0,
        }

        response = requests.post(
            f"{self.base_url}/v1/chat/completions",
            json=json,
            headers=headers,
        )

        # print(response.json()["choices"][0]["message"]["content"])

        return response.json()["choices"][0]["message"]["content"]

    def _translate_text_list(
        self, text_list: list[str], target_language: str = "en"
    ) -> list[str]:

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        # prompt = f"""
        # You are a professional translator.

        # Translate the following list of strings into {target_language}.

        # Rules:
        # - Keep meaning accurate
        # - Preserve tone
        # - Return ONLY a JSON list of translated strings
        # - Do NOT add explanations
        # - Output must match input order exactly

        # Input:
        # {text_list}
        # """

        # prompt = f"""
        # Translate the following: {text_list} to {target_language} and return the result as a JSON list of strings.
        # Response format: ["translated_text_1", "translated_text_2", "translated_text_3", ...]
        # """

        prompt = f"""
        The following is a list of text bubbles extracted from a mnaga page: {text_list}. Translate the text to {target_language} and return the result as a JSON list of strings.
        You may rephrase the text to make it more natural and accurate.
        Response format: ["translated_text_1", "translated_text_2", ...]
        """

        json_payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a professional localizer whose primary goal is to translate Japanese to English. You should use colloquial or slang or nsfw vocabulary if it makes the translation more accurate. You will support other languages  when able.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "temperature": 0.1,
            "max_tokens": 1024,  # hard cap — this list needs maybe 200 at most
            "stop": ["```", "<|im_end|>", "<|end|>"],  # bail out of markdown fences too
            "grammar": r"""
                root   ::= "[" ws item ("," ws item)* ws "]"
                item   ::= "\"" ([^"\\] | "\\" .)* "\""
                ws     ::= [ \t\n]*
            """,
        }

        # print(json_payload)

        response = requests.post(
            f"{self.base_url}/v1/chat/completions",
            json=json_payload,
            headers=headers,
            timeout=20,
        )

        content = response.json()["choices"][0]["message"]["content"]
        print(content)
        # Parse safely

        try:
            return json.loads(content)
        except Exception:
            # fallback: very common in local models
            return self._clean_json_response(content)

    # def _clean_json_response(self, response: str) -> list[str]:
    #     """
    #     Cleans the JSON response from the translation model
    #     """
    #     clean_string = response.strip("```json").strip("```")
    #     # remove double quotes
    #     clean_string = clean_string.replace('""', '"')
    #     clean_string = clean_string.strip(".")
    #     try:
    #         return json.loads(clean_string)
    #     except Exception:
    #         print(f"Error parsing JSON: {clean_string}")
    #         return []

    def _clean_json_response(self, response: str) -> list[str]:
        """
        Cleans the JSON response from the translation model
        """
        text = response.strip()

        # 1. Try to extract a JSON array from a markdown fence first
        fence_match = re.search(r"```(?:json)?\s*(\[.*?])\s*```", text, re.DOTALL)
        if fence_match:
            text = fence_match.group(1)
        else:
            # 2. Find the first [ ... ] span in the response regardless of surrounding text
            array_match = re.search(r"\[.*]", text, re.DOTALL)
            if array_match:
                text = array_match.group(0)

        # 3. Fix common model formatting mistakes
        text = text.replace("\u201c", '"').replace("\u201d", '"')  # curly quotes
        text = text.replace("'", '"')  # single quotes (risky but common)
        text = re.sub(r",\s*]", "]", text)  # trailing commas
        text = re.sub(r'"\s*\n\s*"', '", "', text)  # newlines between items

        try:
            result = json.loads(text)
            if isinstance(result, list):
                return [str(item) for item in result]
        except json.JSONDecodeError:
            pass

        print(f"Failed to parse JSON response:\n{text}")
        return []

    def translate_text_list(
        self, text_list: list[str], target_language: str = "en"
    ) -> list[str]:

        batches = self._split_into_batches_for_translation(text_list)
        print(f"Number of batches: {len(batches)} from {len(''.join(text_list))}")
        print(text_list)
        translated_text_list = []
        for batch in batches:
            translated_text_list.extend(
                self._translate_text_list(batch, target_language)
            )
        return translated_text_list

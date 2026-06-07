import base64
import requests

import json


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

        print(response.json()["choices"][0]["message"]["content"])

        return response.json()["choices"][0]["message"]["content"]

    def translate_text_list(
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
        The following is a list of text bubble extracted from a mnaga page: {text_list}. Translate the text to {target_language} and return the result as a JSON list of strings.
        Response format: ["translated_text_1", "translated_text_2", "translated_text_3", ...]
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
                }
            ],
            "temperature": 0,
        }

        print(json_payload)

        response = requests.post(
            f"{self.base_url}/v1/chat/completions",
            json=json_payload,
            headers=headers,
        )

        content = response.json()["choices"][0]["message"]["content"]
        # print(content)
        # Parse safely

        try:
            return json.loads(content)
        except Exception:
            # fallback: very common in local models
            return self._clean_json_response(content)


    def _clean_json_response(self, response: str) -> list[str]:
        """
        Cleans the JSON response from the translation model
        """
        clean_string = response.strip("```json").strip("```")
        try:
            return json.loads(clean_string)
        except Exception:
            print(f"Error parsing JSON: {clean_string}")
            return []

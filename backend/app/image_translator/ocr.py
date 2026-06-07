import base64
import requests


class OCR:
    def __init__(
        self, model: str, api_key: str, base_url: str = "http://localhost:8080"
    ):
        """
        Initializes the OCR class

        Args:
            model: The model to use for OCR (A multimodal model or a OCR model)
            api_key: The API key to use for the OCR model
        """
        self.base_url = base_url
        self.model = model
        self.api_key = api_key

    def _encode_image(self, path: str) -> str:
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode()

    def _encode_image_bytes(self, image_data: bytes) -> str:
        return base64.b64encode(image_data).decode()

    def get_image_text(self, image: bytes | str) -> str:
        """
        Extracts text from an image using the OCR model
        """
        if isinstance(image, str):
            image_b64 = self._encode_image(image)
        else:
            image_b64 = self._encode_image_bytes(image)
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
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                        },
                        {
                            "type": "text",
                            "text": "Extract all text from this image. Keep layout.",
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

        print(response.json())
        return response.json()["choices"][0]["message"]["content"]

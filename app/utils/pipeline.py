from utils.ocr import OCR
from utils.text_detector import ComicTextDetector
from utils.translate import Translator
import io
from core.config import settings
from PIL import Image
import time


class ComicTranslator:
    def __init__(self):
        self.ocr = OCR(model=settings.OCR_MODEL, api_key=settings.LLM_API_KEY)
        self.text_detector = ComicTextDetector(
            hf_token=settings.HF_TOKEN, model_id=settings.BUBBLE_DETECTION_MODEL_ID
        )
        self.translator = Translator(
            model=settings.TRANSLATION_MODEL, api_key=settings.LLM_API_KEY
        )

    def tanslate_comic_page(self, data: bytes, target_language: str = "en") -> bytes:
        """Translate a comic page

        Args:
            data: The data of the comic page to translate
            target_language: The target language to translate the comic page to

        Returns:
            The translated comic page as bytes
        """
        # Convert the data to an image object
        image = Image.open(io.BytesIO(data))

        start_time = time.time()
        # Get image boxes
        text_boxes = self.text_detector.detect_image_text_boxes(image)
        print(f"Time taken to detect text boxes: {time.time() - start_time} seconds")
        extracted_text: list[str] = []
        # translate each text box and replace the text box with the translated text
        for text_box in text_boxes:
            start_time = time.time()
            box_image = self.text_detector.copy_text_box_section(image, text_box)
            box_image_io = io.BytesIO()
            box_image.save(box_image_io, format="JPEG")
            text = self.ocr.get_image_text(box_image_io.getvalue())
            print(f"Time taken to extract text: {time.time() - start_time} seconds")
            extracted_text.append(text)

        # Write the extracted text to a file
        with open("extracted_text.txt", "w") as f:
            for text in extracted_text:
                f.write(text + "\n")

        print("Starting translation...")
        # for text in extracted_text:
        #     start_time = time.time()
        #     output_text = self.translator.translate_text(text, target_language)
        #     print(f"Time taken to translate text: {time.time() - start_time} seconds")
        #     translated_text.append(output_text)

        translated_text = self.translator.translate_text_list(
            extracted_text, target_language
        )

        image = self.text_detector.replace_text_boxes_v2(
            image, text_boxes, translated_text
        )

        # Convert the image to bytes
        output_buffer = io.BytesIO()
        image.save(output_buffer, format="JPEG")
        return output_buffer.getvalue()

    def label_comic_page(self, data: bytes) -> None:
        """Label a comic page

        Args:
            data: The data of the comic page to label

        Returns:
            The labelled comic page as bytes
        """
        # Convert the data to an image object
        image = Image.open(io.BytesIO(data))

        start_time = time.time()
        # Get image boxes
        text_boxes = self.text_detector.detect_image_text_boxes(image)
        print(f"Time taken to detect text boxes: {time.time() - start_time} seconds")

from utils.pipeline import ComicTranslator


def main():
    comic_translator = ComicTranslator()
    with open("app/images/japanese_test.jpg", "rb") as f:
        data = f.read()
    # comic_translator.label_comic_page(data)
    translated_data = comic_translator.tanslate_comic_page(data, "en")
    with open("app/images/japanese_test_translated.jpg", "wb") as f:
        f.write(translated_data)


if __name__ == "__main__":
    main()

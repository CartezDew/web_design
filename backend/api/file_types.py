"""The same attachment policy applies to reservations and both storage providers."""
from io import BytesIO
import warnings

from PIL import Image
from pypdf import PdfReader

ALLOWED = {
    "image/jpeg": {"jpg", "jpeg"},
    "image/png": {"png"},
    "image/webp": {"webp"},
    "image/gif": {"gif"},
    "image/avif": {"avif"},
    "image/bmp": {"bmp"},
    "image/tiff": {"tif", "tiff"},
    "application/pdf": {"pdf"},
}
IMAGE_FORMATS = {
    "image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP",
    "image/gif": "GIF", "image/avif": "AVIF", "image/bmp": "BMP", "image/tiff": "TIFF",
}
FORMAT_MESSAGE = "Use JPG/JPEG, PNG, WebP, GIF, AVIF, BMP, TIFF, or PDF. Images and PDF files only."


def validate_file_contents(data, content_type):
    if content_type not in ALLOWED:
        return False, FORMAT_MESSAGE
    if content_type == "application/pdf":
        if not data.startswith(b"%PDF-"):
            return False, "File contents do not match the declared type."
        try:
            reader = PdfReader(BytesIO(data))
            if reader.is_encrypted and not reader.decrypt(""):
                return False, "Please upload a PDF that opens without a password."
            if not reader.pages:
                raise ValueError("PDF has no pages")
        except Exception:
            return False, "This PDF cannot be read. Export it as a PDF and try again."
        return True, ""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                if image.format != IMAGE_FORMATS[content_type]:
                    return False, "File contents do not match the declared type."
                if image.width * image.height > 40_000_000:
                    raise ValueError("Image dimensions too large")
                image.verify()
            # verify() is a no-op for some decoders. Decode a frame as well,
            # so a truncated JPEG/BMP is not accepted on its header alone.
            with Image.open(BytesIO(data)) as image:
                image.load()
    except Exception:
        return False, "This image cannot be read or has oversized dimensions."
    return True, ""

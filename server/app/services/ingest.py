import io
import logging
import re
import xml.etree.ElementTree as ET
from typing import Optional

logger = logging.getLogger(__name__)


def _clean_pdf_text(text: str) -> str:
    """Clean up PDF-extracted text: collapse whitespace runs, strip blank lines."""
    # Collapse runs of 3+ spaces to a single space
    text = re.sub(r" {3,}", " ", text)
    # Strip lines that are only whitespace
    lines = [line for line in text.splitlines() if line.strip()]
    return "\n".join(lines)


def extract_pdf(content_bytes: bytes) -> str:
    """T9: Extract text from PDF using pdfplumber."""
    import pdfplumber

    text_parts = []
    with pdfplumber.open(io.BytesIO(content_bytes)) as pdf:
        for page in pdf.pages:
            # Try without layout first for cleaner output
            page_text = page.extract_text(layout=False)
            if not page_text or len(page_text.strip()) < 20:
                # Fallback to layout mode
                page_text = page.extract_text(layout=True)
            if page_text:
                text_parts.append(page_text)

    text = "\n".join(text_parts)
    text = _clean_pdf_text(text)
    if len(text.strip()) < 100:
        logger.warning("PDF extracted less than 100 characters — may be scanned/image-based")
    return text


def extract_text(content_bytes: bytes) -> str:
    """T10: Extract plain text. UTF-8 decode, strip BOM."""
    try:
        text = content_bytes.decode("utf-8-sig")  # handles BOM
    except UnicodeDecodeError:
        try:
            text = content_bytes.decode("latin-1")
        except UnicodeDecodeError:
            text = content_bytes.decode("utf-8", errors="replace")
    return text


def extract_fountain(content_bytes: bytes) -> str:
    """T11: Extract from Fountain format. Fountain is human-readable, so raw text is fine."""
    # Fountain is human-readable plain text, so just decode
    return extract_text(content_bytes)


def extract_fdx(content_bytes: bytes) -> str:
    """T12: Extract from Final Draft FDX (XML). Extract Paragraph elements."""
    try:
        root = ET.fromstring(content_bytes)
        paragraphs = []
        for para in root.iter("Paragraph"):
            para_type = para.get("Type", "")
            texts = []
            for text_elem in para.iter("Text"):
                if text_elem.text:
                    texts.append(text_elem.text)
            line = " ".join(texts).strip()
            if not line:
                continue

            # Format based on paragraph type
            if para_type in ("Scene Heading",):
                paragraphs.append(f"\n{line}\n")
            elif para_type in ("Character",):
                paragraphs.append(f"\n{line}")
            elif para_type in ("Parenthetical",):
                paragraphs.append(f"({line})")
            elif para_type in ("Dialogue",):
                paragraphs.append(line)
            elif para_type in ("Action", "General", "Transition"):
                paragraphs.append(f"\n{line}")
            else:
                paragraphs.append(line)

        text = "\n".join(paragraphs)
        if text.strip():
            return text
    except ET.ParseError:
        logger.warning("FDX XML parse failed, falling back to raw text")

    # Fallback: raw text
    return extract_text(content_bytes)


def ingest_script(
    filename: Optional[str] = None,
    content_bytes: Optional[bytes] = None,
    content_text: Optional[str] = None,
) -> tuple[str, str]:
    """T13: Dispatch script ingestion based on format.

    Returns: (extracted_text, format_name)
    """
    # Direct text paste
    if content_text:
        return content_text, "text_paste"

    if content_bytes is None:
        raise ValueError("Either content_bytes or content_text must be provided")

    if not filename:
        filename = "unknown.txt"

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    if ext == "pdf":
        return extract_pdf(content_bytes), "pdf"
    elif ext == "fdx":
        return extract_fdx(content_bytes), "fdx"
    elif ext == "fountain":
        return extract_fountain(content_bytes), "fountain"
    elif ext in ("txt", "md", "text"):
        return extract_text(content_bytes), "text"
    else:
        # Best effort: try plain text
        logger.warning(f"Unknown extension '{ext}', treating as plain text")
        return extract_text(content_bytes), "text"

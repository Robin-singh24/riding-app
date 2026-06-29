import sys, json, os

def parse_page_range(spec, total):
    if not spec or spec == "all":
        return list(range(total))
    pages = set()
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            start = max(1, int(start))
            end = min(total, int(end))
            pages.update(range(start - 1, end))
        else:
            p = int(part)
            if 1 <= p <= total:
                pages.add(p - 1)
    return sorted(pages)

def parse_pdf(file_path, options):
    import pymupdf
    import pymupdf4llm

    doc = pymupdf.open(file_path)
    page_count = len(doc)

    pages = None
    if options.get("pages"):
        pages = parse_page_range(options["pages"], page_count)

    md = pymupdf4llm.to_markdown(file_path, pages=pages)

    table_count = 0
    for page in doc:
        try:
            tables = page.find_tables()
            table_count += len(tables.tables)
        except Exception:
            pass
    doc.close()

    title = os.path.splitext(os.path.basename(file_path))[0]
    return md, {"title": title, "pages": page_count, "tables": table_count}

def parse_pdf_ocr(file_path, options):
    import pymupdf
    from rapidocr_onnxruntime import RapidOCR

    ocr = RapidOCR()
    doc = pymupdf.open(file_path)
    page_count = len(doc)
    pages = parse_page_range(options.get("pages"), page_count) if options.get("pages") else range(page_count)

    text_parts = []
    for page_num in pages:
        page = doc[page_num]
        text = page.get_text().strip()
        if len(text) > 50:
            text_parts.append(text)
        else:
            pix = page.get_pixmap(dpi=300)
            img_bytes = pix.tobytes("png")
            result, _ = ocr(img_bytes)
            if result:
                text_parts.append("\n".join([line[1] for line in result]))

    doc.close()
    md = "\n\n---\n\n".join(text_parts)
    title = os.path.splitext(os.path.basename(file_path))[0]
    return md, {"title": title, "pages": page_count, "tables": 0}

def parse_office(file_path, options):
    from markitdown import MarkItDown

    mid = MarkItDown()
    result = mid.convert(file_path)
    md = result.text_content
    title = getattr(result, "title", "") or os.path.splitext(os.path.basename(file_path))[0]
    return md, {"title": title, "pages": None, "tables": 0}

def parse_image_ocr(file_path, options):
    from rapidocr_onnxruntime import RapidOCR

    ocr = RapidOCR()
    result, _ = ocr(file_path)
    if result:
        md = "\n".join([line[1] for line in result])
    else:
        md = "(No text detected in image)"
    title = os.path.splitext(os.path.basename(file_path))[0]
    return md, {"title": title, "pages": None, "tables": 0}

def main():
    file_path = sys.argv[1]
    options = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    ext = os.path.splitext(file_path)[1].lower()
    file_size = os.path.getsize(file_path)

    PDF_EXTS = {".pdf"}
    OFFICE_EXTS = {".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".html", ".htm", ".epub", ".rtf", ".eml", ".msg"}
    IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}

    try:
        if ext in PDF_EXTS:
            if options.get("ocr"):
                md, meta = parse_pdf_ocr(file_path, options)
            else:
                md, meta = parse_pdf(file_path, options)
        elif ext in OFFICE_EXTS:
            md, meta = parse_office(file_path, options)
        elif ext in IMAGE_EXTS:
            md, meta = parse_image_ocr(file_path, options)
        else:
            print(json.dumps({"error": "Unsupported format: " + ext}))
            sys.exit(1)
    except ImportError as e:
        module = str(e).split("'")[1] if "'" in str(e) else str(e)
        pkg_map = {
            "pymupdf4llm": "pymupdf4llm", "fitz": "pymupdf", "pymupdf": "pymupdf",
            "markitdown": "markitdown[docx,pptx,xlsx]",
            "rapidocr_onnxruntime": "rapidocr-onnxruntime",
        }
        pkg = pkg_map.get(module, module)
        print(json.dumps({"error": "Missing library: " + module + ". Install with: pip install " + pkg}))
        sys.exit(1)

    word_count = len(md.split()) if md else 0
    meta["wordCount"] = word_count
    meta["fileSize"] = file_size
    meta.setdefault("title", "")
    meta.setdefault("pages", None)
    meta.setdefault("tables", 0)

    print(json.dumps({"markdown": md, "meta": meta}))

if __name__ == "__main__":
    main()
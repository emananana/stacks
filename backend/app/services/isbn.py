import re
from dataclasses import dataclass

from app.core.errors import AppError


@dataclass(frozen=True)
class ISBN:
    isbn13: str
    isbn10: str | None


def _check13(first12: str) -> str:
    return str((-sum(int(c) * (1 if i % 2 == 0 else 3) for i, c in enumerate(first12))) % 10)


def normalize_isbn(raw: str) -> ISBN:
    """Validate checksum, accepting only ASCII digits/X plus spaces and hyphens."""
    value = re.sub(r"[\s-]", "", raw).upper()
    invalid = AppError(
        "invalid_isbn", "Enter a valid ISBN-10 or ISBN-13, including its check digit.", 422
    )
    if re.fullmatch(r"[0-9]{9}[0-9X]", value):
        digits = [int(c) if c != "X" else 10 for c in value]
        if sum((10 - i) * digit for i, digit in enumerate(digits)) % 11:
            raise invalid
        prefix = "978" + value[:9]
        return ISBN(prefix + _check13(prefix), value)
    if re.fullmatch(r"97[89][0-9]{10}", value) and _check13(value[:12]) == value[-1]:
        isbn10 = None
        if value.startswith("978"):
            body = value[3:12]
            check = (-sum((10 - i) * int(c) for i, c in enumerate(body))) % 11
            isbn10 = body + ("X" if check == 10 else str(check))
        return ISBN(value, isbn10)
    raise invalid

import pytest

from app.core.errors import AppError
from app.services.isbn import normalize_isbn


@pytest.mark.parametrize(
    "raw,expected13,expected10",
    [
        ("0-14-032872-6", "9780140328721", "0140328726"),
        (" 978 0 14 032872 1 ", "9780140328721", "0140328726"),
        ("0-8044-2957-x", "9780804429573", "080442957X"),
        ("9780804429573", "9780804429573", "080442957X"),
        ("9791090636071", "9791090636071", None),
    ],
)
def test_normalization(raw, expected13, expected10):
    isbn = normalize_isbn(raw)
    assert (isbn.isbn13, isbn.isbn10) == (expected13, expected10)


@pytest.mark.parametrize(
    "raw",
    [
        "",
        "123",
        "9780140328722",
        "0140328725",
        "1234567890128",
        "978014032872X",
        "X140328726",
        "ISBN:0140328726",
        "９７８０１４０３２８７２１",
        "978/0140328721",
        "0140328726junk",
        "97801403287210",
    ],
)
def test_rejects_invalid_isbn(raw):
    with pytest.raises(AppError) as error:
        normalize_isbn(raw)
    assert error.value.code == "invalid_isbn"
    assert error.value.status == 422

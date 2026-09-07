"""Initial edition, author, and physical copy schema."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "book_editions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("isbn13", sa.String(13), nullable=False),
        sa.Column("isbn10", sa.String(10), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("subtitle", sa.Text(), nullable=True),
        sa.Column("publisher", sa.Text(), nullable=True),
        sa.Column("publication_date", sa.Text(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("cover_url", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metadata_provider", sa.String(40), nullable=False),
        sa.Column("provider_id", sa.Text(), nullable=True),
        sa.Column(
            "fetched_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name="pk_book_editions"),
        sa.UniqueConstraint("isbn13", name="uq_book_editions_isbn13"),
        sa.UniqueConstraint("isbn10", name="uq_book_editions_isbn10"),
        sa.CheckConstraint("page_count IS NULL OR page_count > 0", name="positive_page_count"),
    )
    op.create_table(
        "authors",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(40), nullable=True),
        sa.Column("provider_id", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_authors"),
        sa.UniqueConstraint("provider", "provider_id", name="uq_authors_provider"),
    )
    op.create_table(
        "edition_authors",
        sa.Column("book_edition_id", sa.Uuid(), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["book_edition_id"],
            ["book_editions.id"],
            ondelete="CASCADE",
            name="fk_edition_authors_book_edition_id_book_editions",
        ),
        sa.ForeignKeyConstraint(
            ["author_id"],
            ["authors.id"],
            ondelete="RESTRICT",
            name="fk_edition_authors_author_id_authors",
        ),
        sa.PrimaryKeyConstraint("book_edition_id", "author_id", name="pk_edition_authors"),
        sa.UniqueConstraint(
            "book_edition_id", "position", name="uq_edition_authors_book_edition_id"
        ),
        sa.CheckConstraint("position >= 0", name="nonnegative_position"),
    )
    op.create_table(
        "library_copies",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("book_edition_id", sa.Uuid(), nullable=False),
        sa.Column("acquisition_key", sa.Uuid(), nullable=False),
        sa.Column("reading_status", sa.String(10), server_default="unread", nullable=False),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("shelf", sa.String(120), nullable=True),
        sa.Column("date_acquired", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name="pk_library_copies"),
        sa.ForeignKeyConstraint(
            ["book_edition_id"],
            ["book_editions.id"],
            ondelete="RESTRICT",
            name="fk_library_copies_book_edition_id_book_editions",
        ),
        sa.UniqueConstraint("acquisition_key", name="uq_library_copies_acquisition_key"),
        sa.CheckConstraint(
            "reading_status IN ('unread', 'reading', 'read')", name="reading_status"
        ),
        sa.CheckConstraint("rating IS NULL OR rating BETWEEN 1 AND 5", name="rating_range"),
    )
    op.create_index("ix_library_copies_book_edition_id", "library_copies", ["book_edition_id"])


def downgrade():
    op.drop_index("ix_library_copies_book_edition_id", table_name="library_copies")
    op.drop_table("library_copies")
    op.drop_table("edition_authors")
    op.drop_table("authors")
    op.drop_table("book_editions")

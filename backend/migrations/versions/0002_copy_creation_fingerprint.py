"""Remember original save content for idempotent retries."""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    # Nullable for any pre-existing rows created outside the new endpoint. Their
    # keys fail closed on replay; no original payload can be inferred reliably.
    op.add_column("library_copies", sa.Column("creation_fingerprint", sa.String(64), nullable=True))


def downgrade():
    op.drop_column("library_copies", "creation_fingerprint")

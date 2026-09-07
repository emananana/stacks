"""Accounts, revocable sessions, and per-user physical copies."""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(320), unique=True),
        sa.Column("password_hash", sa.String(255)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.execute("INSERT INTO users (id) VALUES ('00000000-0000-0000-0000-000000000001')")
    op.create_table(
        "auth_sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index("ix_auth_sessions_expires_at", "auth_sessions", ["expires_at"])
    op.add_column("library_copies", sa.Column("user_id", sa.Uuid(), nullable=True))
    op.execute("UPDATE library_copies SET user_id = '00000000-0000-0000-0000-000000000001'")
    op.alter_column("library_copies", "user_id", nullable=False)
    op.create_foreign_key(
        "fk_library_copies_user_id_users",
        "library_copies",
        "users",
        ["user_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_library_copies_user_id", "library_copies", ["user_id"])
    op.drop_constraint("uq_library_copies_acquisition_key", "library_copies", type_="unique")
    op.create_unique_constraint(
        "uq_copy_owner_acquisition", "library_copies", ["user_id", "acquisition_key"]
    )


def downgrade():
    # Downgrade refuses duplicate keys across users rather than silently deleting copies.
    op.drop_constraint("uq_copy_owner_acquisition", "library_copies", type_="unique")
    op.create_unique_constraint(
        "uq_library_copies_acquisition_key", "library_copies", ["acquisition_key"]
    )
    op.drop_index("ix_library_copies_user_id", "library_copies")
    op.drop_constraint("fk_library_copies_user_id_users", "library_copies", type_="foreignkey")
    op.drop_column("library_copies", "user_id")
    op.drop_table("auth_sessions")
    op.drop_table("users")

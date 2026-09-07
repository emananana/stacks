"""Local-only operator command: python -m app.claim_library account@example.com."""

import asyncio
import sys

from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.session import create_database
from app.models.accounts import LEGACY_USER_ID, User
from app.models.catalog import LibraryCopy


async def claim(email: str):
    engine, sessions = create_database(get_settings())
    try:
        async with sessions() as session, session.begin():
            owner = await session.scalar(
                select(User).where(
                    User.email == email.strip().lower(), User.password_hash.is_not(None)
                )
            )
            if not owner:
                raise SystemExit(
                    "Create this account in Stacks first, then run this command again."
                )
            result = await session.execute(
                update(LibraryCopy)
                .where(LibraryCopy.user_id == LEGACY_USER_ID)
                .values(user_id=owner.id)
            )
            print(f"Transferred {result.rowcount} existing copies to the selected account.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m app.claim_library account@example.com")
    asyncio.run(claim(sys.argv[1]))

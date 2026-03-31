"""add demo metadata on organizations

Revision ID: 0014_demo_seed_metadata
Revises: 0013_ai_automation_layer
Create Date: 2026-03-31
"""

from alembic import op
import sqlalchemy as sa


revision = "0014_demo_seed_metadata"
down_revision = "0013_ai_automation_layer"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("organizations", sa.Column("demo_scenario_key", sa.String(length=120), nullable=True))
    op.add_column("organizations", sa.Column("seed_version", sa.String(length=40), nullable=True))
    op.add_column("organizations", sa.Column("seeded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("organizations", sa.Column("seeded_by_system", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("organizations", sa.Column("resettable_in_non_prod", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("organizations", sa.Column("demo_expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "demo_expires_at")
    op.drop_column("organizations", "resettable_in_non_prod")
    op.drop_column("organizations", "seeded_by_system")
    op.drop_column("organizations", "seeded_at")
    op.drop_column("organizations", "seed_version")
    op.drop_column("organizations", "demo_scenario_key")
    op.drop_column("organizations", "is_demo")

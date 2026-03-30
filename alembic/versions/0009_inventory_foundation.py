"""inventory foundation

Revision ID: 0009_inventory_foundation
Revises: 0008_settings_docs_notifications
Create Date: 2026-03-22
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0009_inventory_foundation"
down_revision = "0008_settings_docs_notifications"
branch_labels = None
depends_on = None


inventory_costing_method = postgresql.ENUM("weighted_average", name="inventory_costing_method", create_type=False)
inventory_valuation_method = postgresql.ENUM("weighted_average", name="inventory_valuation_method", create_type=False)
inventory_movement_type = postgresql.ENUM(
    "opening",
    "purchase",
    "sale",
    "adjustment_in",
    "adjustment_out",
    "transfer_in",
    "transfer_out",
    "reversal",
    name="inventory_movement_type",
    create_type=False,
)
inventory_source_entity_type = postgresql.ENUM(
    "opening_stock",
    "bill",
    "invoice",
    "adjustment",
    "transfer",
    "manual",
    name="inventory_source_entity_type",
    create_type=False,
)
inventory_adjustment_type = postgresql.ENUM(
    "opening_stock",
    "quantity_write_up",
    "quantity_write_down",
    name="inventory_adjustment_type",
    create_type=False,
)


def upgrade() -> None:
    for enum in [
        inventory_costing_method,
        inventory_valuation_method,
        inventory_movement_type,
        inventory_source_entity_type,
        inventory_adjustment_type,
    ]:
        enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("sku", sa.String(100), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_sellable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_purchasable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_tracked_inventory", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("unit_of_measure", sa.String(50), nullable=True),
        sa.Column("sales_price", sa.Numeric(20, 8), nullable=True),
        sa.Column("purchase_price", sa.Numeric(20, 8), nullable=True),
        sa.Column("income_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("expense_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("inventory_asset_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=True),
        sa.Column("sales_tax_code_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tax_codes.id"), nullable=True),
        sa.Column("purchase_tax_code_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tax_codes.id"), nullable=True),
        sa.Column("costing_method", inventory_costing_method, nullable=False, server_default="weighted_average"),
        sa.Column("valuation_method", inventory_valuation_method, nullable=False, server_default="weighted_average"),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", "sku", name="uq_item_org_sku"),
    )
    op.create_index("ix_items_org", "items", ["organization_id"])

    op.create_table(
        "inventory_locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("organization_id", "code", name="uq_inventory_location_org_code"),
    )
    op.create_index("ix_inventory_locations_org", "inventory_locations", ["organization_id"])

    op.create_table(
        "inventory_balances",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("items.id"), nullable=False),
        sa.Column("location_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_locations.id"), nullable=True),
        sa.Column("quantity_on_hand", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("reserved_quantity", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("available_quantity", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("average_unit_cost", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("inventory_value", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("organization_id", "item_id", "location_id", name="uq_inventory_balance_scope"),
    )
    op.create_index("ix_inventory_balances_org", "inventory_balances", ["organization_id"])
    op.create_index("ix_inventory_balances_item", "inventory_balances", ["item_id"])
    op.create_index("ix_inventory_balances_location", "inventory_balances", ["location_id"])

    op.create_table(
        "inventory_movements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("items.id"), nullable=False),
        sa.Column("location_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_locations.id"), nullable=True),
        sa.Column("movement_type", inventory_movement_type, nullable=False),
        sa.Column("source_entity_type", inventory_source_entity_type, nullable=False),
        sa.Column("source_entity_id", sa.String(100), nullable=True),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("unit_cost", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("total_cost", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("quantity_balance_after", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("inventory_value_after", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("average_unit_cost_after", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reversal_of_movement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_movements.id"), nullable=True),
        sa.Column("accounting_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("quantity != 0", name="ck_inventory_movement_quantity_non_zero"),
    )
    op.create_index("ix_inventory_movements_org", "inventory_movements", ["organization_id"])
    op.create_index("ix_inventory_movements_item", "inventory_movements", ["item_id"])
    op.create_index("ix_inventory_movements_location", "inventory_movements", ["location_id"])
    op.create_index("ix_inventory_movements_source_id", "inventory_movements", ["source_entity_id"])
    op.create_index("ix_inventory_movements_reversal", "inventory_movements", ["reversal_of_movement_id"])

    op.create_table(
        "inventory_adjustments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("items.id"), nullable=False),
        sa.Column("location_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_locations.id"), nullable=True),
        sa.Column("adjustment_type", inventory_adjustment_type, nullable=False),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("unit_cost", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("total_cost", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("reason", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("offset_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("movement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_movements.id"), nullable=True),
        sa.Column("posted_journal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("journal_entries.id"), nullable=True),
        sa.Column("reversal_adjustment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_adjustments.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("quantity != 0", name="ck_inventory_adjustment_quantity_non_zero"),
    )
    op.create_index("ix_inventory_adjustments_org", "inventory_adjustments", ["organization_id"])
    op.create_index("ix_inventory_adjustments_item", "inventory_adjustments", ["item_id"])

    op.add_column("invoice_items", sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("invoice_items", sa.Column("location_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_invoice_items_item_id", "invoice_items", "items", ["item_id"], ["id"])
    op.create_foreign_key("fk_invoice_items_location_id", "invoice_items", "inventory_locations", ["location_id"], ["id"])
    op.create_index("ix_invoice_items_item_id", "invoice_items", ["item_id"])
    op.create_index("ix_invoice_items_location_id", "invoice_items", ["location_id"])

    op.add_column("bill_items", sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("bill_items", sa.Column("location_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_bill_items_item_id", "bill_items", "items", ["item_id"], ["id"])
    op.create_foreign_key("fk_bill_items_location_id", "bill_items", "inventory_locations", ["location_id"], ["id"])
    op.create_index("ix_bill_items_item_id", "bill_items", ["item_id"])
    op.create_index("ix_bill_items_location_id", "bill_items", ["location_id"])


def downgrade() -> None:
    for name in ["ix_bill_items_location_id", "ix_bill_items_item_id"]:
        op.drop_index(name, table_name="bill_items")
    op.drop_constraint("fk_bill_items_location_id", "bill_items", type_="foreignkey")
    op.drop_constraint("fk_bill_items_item_id", "bill_items", type_="foreignkey")
    op.drop_column("bill_items", "location_id")
    op.drop_column("bill_items", "item_id")

    for name in ["ix_invoice_items_location_id", "ix_invoice_items_item_id"]:
        op.drop_index(name, table_name="invoice_items")
    op.drop_constraint("fk_invoice_items_location_id", "invoice_items", type_="foreignkey")
    op.drop_constraint("fk_invoice_items_item_id", "invoice_items", type_="foreignkey")
    op.drop_column("invoice_items", "location_id")
    op.drop_column("invoice_items", "item_id")

    for name in ["ix_inventory_adjustments_item", "ix_inventory_adjustments_org"]:
        op.drop_index(name, table_name="inventory_adjustments")
    op.drop_table("inventory_adjustments")

    for name in ["ix_inventory_movements_reversal", "ix_inventory_movements_source_id", "ix_inventory_movements_location", "ix_inventory_movements_item", "ix_inventory_movements_org"]:
        op.drop_index(name, table_name="inventory_movements")
    op.drop_table("inventory_movements")

    for name in ["ix_inventory_balances_location", "ix_inventory_balances_item", "ix_inventory_balances_org"]:
        op.drop_index(name, table_name="inventory_balances")
    op.drop_table("inventory_balances")

    op.drop_index("ix_inventory_locations_org", table_name="inventory_locations")
    op.drop_table("inventory_locations")

    op.drop_index("ix_items_org", table_name="items")
    op.drop_table("items")

    for enum in [
        inventory_adjustment_type,
        inventory_source_entity_type,
        inventory_movement_type,
        inventory_valuation_method,
        inventory_costing_method,
    ]:
        enum.drop(op.get_bind(), checkfirst=True)

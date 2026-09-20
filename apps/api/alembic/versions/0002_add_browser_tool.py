"""add browser tool

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-20 10:25:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Update existing agents to have 'browser' in their allowed_tools if not already present
    op.execute("""
        UPDATE agents 
        SET tool_permissions = jsonb_set(
            tool_permissions::jsonb, 
            '{allowed_tools}', 
            (tool_permissions->'allowed_tools')::jsonb || '["browser"]'::jsonb
        ) 
        WHERE tool_permissions ? 'allowed_tools'
        AND NOT (tool_permissions->'allowed_tools')::jsonb ? 'browser';
    """)

def downgrade() -> None:
    # Remove 'browser' from allowed_tools for all agents
    op.execute("""
        UPDATE agents 
        SET tool_permissions = jsonb_set(
            tool_permissions::jsonb, 
            '{allowed_tools}', 
            (
                SELECT jsonb_agg(elem) 
                FROM jsonb_array_elements(tool_permissions->'allowed_tools') elem 
                WHERE elem::text != '"browser"'
            )
        ) 
        WHERE tool_permissions ? 'allowed_tools'
        AND (tool_permissions->'allowed_tools')::jsonb ? 'browser';
    """)

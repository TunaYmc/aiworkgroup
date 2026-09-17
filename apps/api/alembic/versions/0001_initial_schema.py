"""initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-16 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = '0001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Ensure pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector"')

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    if 'users' in tables:
        # Schema already initialized by application lifespan
        return

    # 1. Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('email', sa.String(), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_superuser', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True))
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # 2. Organizations
    op.create_table(
        'organizations',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False, unique=True),
        sa.Column('monthly_token_limit', sa.JSON()),
        sa.Column('monthly_budget_usd', sa.JSON()),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True))
    )
    op.create_index('ix_organizations_slug', 'organizations', ['slug'])

    # 3. Organization Members
    op.create_table(
        'organization_members',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('organization_id', sa.String(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(), default='member'),
        sa.Column('created_at', sa.DateTime(timezone=True))
    )
    op.create_index('ix_organization_members_org_id', 'organization_members', ['organization_id'])
    op.create_index('ix_organization_members_user_id', 'organization_members', ['user_id'])

    # 4. API Keys
    op.create_table(
        'api_keys',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('organization_id', sa.String(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('key_hash', sa.String(), nullable=False, unique=True),
        sa.Column('prefix', sa.String(length=8), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True))
    )

    # 5. Agents
    op.create_table(
        'agents',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('organization_id', sa.String(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('role', sa.String(), default='General Assistant'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('system_instructions', sa.Text(), nullable=False),
        sa.Column('status', sa.String(), default='active'),
        sa.Column('model_config_data', sa.JSON()),
        sa.Column('tool_permissions', sa.JSON()),
        sa.Column('workspace_path', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True))
    )
    op.create_index('ix_agents_org_id', 'agents', ['organization_id'])

    # 6. Tasks
    op.create_table(
        'tasks',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('organization_id', sa.String(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('status', sa.String(), default='queued'),
        sa.Column('priority', sa.String(), default='normal'),
        sa.Column('input_prompt', sa.Text(), nullable=False),
        sa.Column('input_data', sa.JSON(), nullable=True),
        sa.Column('output_result', sa.Text(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('artifacts', sa.JSON()),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True)
    )

    # 7. Agent Files
    op.create_table(
        'agent_files',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('organization_id', sa.String(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(), sa.ForeignKey('agents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('storage_key', sa.String(), nullable=False, unique=True),
        sa.Column('checksum', sa.String(), nullable=True),
        sa.Column('status', sa.String(), default='processing'),
        sa.Column('created_at', sa.DateTime(timezone=True))
    )

    # 8. Knowledge Documents & Chunks (pgvector)
    op.create_table(
        'knowledge_documents',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('organization_id', sa.String(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(), sa.ForeignKey('agents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('source_type', sa.String(), default='file'),
        sa.Column('file_id', sa.String(), sa.ForeignKey('agent_files.id', ondelete='SET NULL'), nullable=True),
        sa.Column('total_chunks', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True))
    )

    op.create_table(
        'knowledge_chunks',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('organization_id', sa.String(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_id', sa.String(), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(), sa.ForeignKey('agents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('chunk_index', sa.Integer(), default=0),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(1536), nullable=True),
        sa.Column('metadata_json', sa.JSON()),
        sa.Column('created_at', sa.DateTime(timezone=True))
    )

    # 9. Audit Logs & Usage
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('organization_id', sa.String(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('agent_id', sa.String(), sa.ForeignKey('agents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('details', sa.JSON()),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True))
    )

    op.create_table(
        'usage_records',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('organization_id', sa.String(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', sa.String(), sa.ForeignKey('agents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('task_id', sa.String(), sa.ForeignKey('tasks.id', ondelete='SET NULL'), nullable=True),
        sa.Column('model', sa.String(), nullable=False),
        sa.Column('provider', sa.String(), default='openrouter'),
        sa.Column('input_tokens', sa.Integer(), default=0),
        sa.Column('output_tokens', sa.Integer(), default=0),
        sa.Column('total_tokens', sa.Integer(), default=0),
        sa.Column('latency_ms', sa.Float(), default=0.0),
        sa.Column('estimated_cost_usd', sa.Float(), default=0.0),
        sa.Column('timestamp', sa.DateTime(timezone=True))
    )

def downgrade() -> None:
    op.drop_table('usage_records')
    op.drop_table('audit_logs')
    op.drop_table('knowledge_chunks')
    op.drop_table('knowledge_documents')
    op.drop_table('agent_files')
    op.drop_table('tasks')
    op.drop_table('agents')
    op.drop_table('api_keys')
    op.drop_table('organization_members')
    op.drop_table('organizations')
    op.drop_table('users')

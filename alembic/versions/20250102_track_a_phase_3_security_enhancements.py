"""Track A Phase 3: Enhanced merchant security and access control

Revision ID: 20250102_track_a_phase_3_security
Revises: 20250630_add_super_admin_rbac_tables
Create Date: 2025-01-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250102_track_a_phase_3_security'
down_revision = '20250630_add_super_admin_rbac_tables'
branch_labels = None
depends_on = None


def upgrade():
    """
    Upgrade database schema for Track A Phase 3 security enhancements.

    Adds enhanced security models:
    - Merchant security policies
    - Security events and incidents
    - Security assessments
    - Enhanced audit logs
    - Security alerts
    """

    # Create merchant_security_policies table
    op.create_table(
        'merchant_security_policies',
        sa.Column('id', postgresql.UUID(as_uuid=True),
                  primary_key=True, default=sa.text('uuid_generate_v4()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('policy_type', sa.String(50), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('rules', postgresql.JSONB, nullable=False),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),
        sa.Column('priority', sa.Integer, default=100, nullable=False),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
    )

    # Create indexes for merchant_security_policies
    op.create_index('idx_merchant_security_policies_tenant_active',
                    'merchant_security_policies', ['tenant_id', 'is_active'])
    op.create_index('idx_merchant_security_policies_type_priority',
                    'merchant_security_policies', ['policy_type', 'priority'])
    op.create_index('idx_merchant_security_policies_tenant_id',
                    'merchant_security_policies', ['tenant_id'])
    op.create_index('idx_merchant_security_policies_policy_type',
                    'merchant_security_policies', ['policy_type'])

    # Create security_events table
    op.create_table(
        'security_events',
        sa.Column('id', postgresql.UUID(as_uuid=True),
                  primary_key=True, default=sa.text('uuid_generate_v4()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('risk_level', sa.String(20), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('metadata', postgresql.JSONB, nullable=True),
        sa.Column('user_id', sa.String(255), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('request_path', sa.String(500), nullable=True),
        sa.Column('request_method', sa.String(10), nullable=True),
        sa.Column('resolved', sa.Boolean, default=False, nullable=False),
        sa.Column('resolved_by', sa.String(255), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolution_notes', sa.Text, nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
    )

    # Create indexes for security_events
    op.create_index('idx_security_events_tenant_timestamp',
                    'security_events', ['tenant_id', 'timestamp'])
    op.create_index('idx_security_events_risk_unresolved',
                    'security_events', ['risk_level', 'resolved'])
    op.create_index('idx_security_events_type_timestamp',
                    'security_events', ['event_type', 'timestamp'])
    op.create_index('idx_security_events_user_timestamp',
                    'security_events', ['user_id', 'timestamp'])
    op.create_index('idx_security_events_tenant_id',
                    'security_events', ['tenant_id'])
    op.create_index('idx_security_events_event_type',
                    'security_events', ['event_type'])
    op.create_index('idx_security_events_risk_level',
                    'security_events', ['risk_level'])
    op.create_index('idx_security_events_user_id',
                    'security_events', ['user_id'])
    op.create_index('idx_security_events_ip_address',
                    'security_events', ['ip_address'])

    # Create security_assessments table
    op.create_table(
        'security_assessments',
        sa.Column('id', postgresql.UUID(as_uuid=True),
                  primary_key=True, default=sa.text('uuid_generate_v4()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('overall_score', sa.Float, nullable=False),
        sa.Column('risk_level', sa.String(20), nullable=False),
        sa.Column('active_threats', sa.Integer, default=0, nullable=False),
        sa.Column('policy_violations', sa.Integer, default=0, nullable=False),
        sa.Column('total_events', sa.Integer, default=0, nullable=False),
        sa.Column('critical_events', sa.Integer, default=0, nullable=False),
        sa.Column('high_risk_events', sa.Integer, default=0, nullable=False),
        sa.Column('assessment_period_days', sa.Integer,
                  default=30, nullable=False),
        sa.Column('recommendations', postgresql.JSONB, nullable=True),
        sa.Column('detailed_metrics', postgresql.JSONB, nullable=True),
        sa.Column('assessment_date', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('generated_by', sa.String(255), nullable=True),
    )

    # Create indexes for security_assessments
    op.create_index('idx_security_assessments_tenant_date',
                    'security_assessments', ['tenant_id', 'assessment_date'])
    op.create_index('idx_security_assessments_score_risk',
                    'security_assessments', ['overall_score', 'risk_level'])
    op.create_index('idx_security_assessments_tenant_id',
                    'security_assessments', ['tenant_id'])

    # Create security_audit_logs table
    op.create_table(
        'security_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True),
                  primary_key=True, default=sa.text('uuid_generate_v4()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(100), nullable=False),
        sa.Column('resource_id', sa.String(255), nullable=True),
        sa.Column('resource_name', sa.String(255), nullable=True),
        sa.Column('user_id', sa.String(255), nullable=False),
        sa.Column('user_email', sa.String(255), nullable=True),
        sa.Column('user_roles', postgresql.JSONB, nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('request_id', sa.String(100), nullable=True),
        sa.Column('session_id', sa.String(100), nullable=True),
        sa.Column('before_state', postgresql.JSONB, nullable=True),
        sa.Column('after_state', postgresql.JSONB, nullable=True),
        sa.Column('changes', postgresql.JSONB, nullable=True),
        sa.Column('metadata', postgresql.JSONB, nullable=True),
        sa.Column('risk_level', sa.String(20), default='low', nullable=False),
        sa.Column('compliance_tags', postgresql.JSONB, nullable=True),
        sa.Column('retention_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('success', sa.Boolean, nullable=False),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('response_code', sa.Integer, nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
    )

    # Create indexes for security_audit_logs
    op.create_index('idx_security_audit_logs_tenant_timestamp',
                    'security_audit_logs', ['tenant_id', 'timestamp'])
    op.create_index('idx_security_audit_logs_user_action',
                    'security_audit_logs', ['user_id', 'action'])
    op.create_index('idx_security_audit_logs_resource',
                    'security_audit_logs', ['resource_type', 'resource_id'])
    op.create_index('idx_security_audit_logs_risk_success',
                    'security_audit_logs', ['risk_level', 'success'])
    op.create_index('idx_security_audit_logs_request_id',
                    'security_audit_logs', ['request_id'])
    op.create_index('idx_security_audit_logs_tenant_id',
                    'security_audit_logs', ['tenant_id'])
    op.create_index('idx_security_audit_logs_action',
                    'security_audit_logs', ['action'])
    op.create_index('idx_security_audit_logs_resource_type',
                    'security_audit_logs', ['resource_type'])
    op.create_index('idx_security_audit_logs_user_id',
                    'security_audit_logs', ['user_id'])
    op.create_index('idx_security_audit_logs_session_id',
                    'security_audit_logs', ['session_id'])

    # Create security_alerts table
    op.create_table(
        'security_alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True),
                  primary_key=True, default=sa.text('uuid_generate_v4()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('alert_type', sa.String(100), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('source_event_id', postgresql.UUID(
            as_uuid=True), nullable=True),
        sa.Column('source_policy_id', postgresql.UUID(
            as_uuid=True), nullable=True),
        sa.Column('source_system', sa.String(100), nullable=True),
        sa.Column('metadata', postgresql.JSONB, nullable=True),
        sa.Column('affected_resources', postgresql.JSONB, nullable=True),
        sa.Column('recommended_actions', postgresql.JSONB, nullable=True),
        sa.Column('status', sa.String(20), default='open', nullable=False),
        sa.Column('acknowledged_by', sa.String(255), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(
            timezone=True), nullable=True),
        sa.Column('resolved_by', sa.String(255), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolution_notes', sa.Text, nullable=True),
        sa.Column('notifications_sent', postgresql.JSONB, nullable=True),
        sa.Column('escalation_level', sa.Integer, default=0, nullable=False),
        sa.Column('last_escalated_at', sa.DateTime(
            timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
    )

    # Create indexes for security_alerts
    op.create_index('idx_security_alerts_tenant_status',
                    'security_alerts', ['tenant_id', 'status'])
    op.create_index('idx_security_alerts_severity_created',
                    'security_alerts', ['severity', 'created_at'])
    op.create_index('idx_security_alerts_type_status',
                    'security_alerts', ['alert_type', 'status'])
    op.create_index('idx_security_alerts_tenant_id',
                    'security_alerts', ['tenant_id'])
    op.create_index('idx_security_alerts_alert_type',
                    'security_alerts', ['alert_type'])
    op.create_index('idx_security_alerts_severity',
                    'security_alerts', ['severity'])

    # Add updated_at trigger for merchant_security_policies
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)

    op.execute("""
        CREATE TRIGGER update_merchant_security_policies_updated_at
        BEFORE UPDATE ON merchant_security_policies
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)

    op.execute("""
        CREATE TRIGGER update_security_alerts_updated_at
        BEFORE UPDATE ON security_alerts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade():
    """
    Downgrade database schema by removing Track A Phase 3 security enhancements.
    """

    # Drop triggers
    op.execute(
        "DROP TRIGGER IF EXISTS update_security_alerts_updated_at ON security_alerts;")
    op.execute(
        "DROP TRIGGER IF EXISTS update_merchant_security_policies_updated_at ON merchant_security_policies;")

    # Drop tables in reverse order to handle foreign key constraints
    op.drop_table('security_alerts')
    op.drop_table('security_audit_logs')
    op.drop_table('security_assessments')
    op.drop_table('security_events')
    op.drop_table('merchant_security_policies')

    # Note: We don't drop the update_updated_at_column function as it might be used by other tables

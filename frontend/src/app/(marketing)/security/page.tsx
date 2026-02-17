import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Shield,
  Lock,
  Eye,
  Server,
  Database,
  Key,
  ArrowLeft,
  Globe,
  Users,
  FileCheck,
  Activity,
  Bell,
  Layers,
  ShieldCheck,
  Fingerprint,
  Bug,
  ClipboardList,
  Leaf,
  CreditCard,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security - Altaviz',
  description:
    'Enterprise-grade security for critical infrastructure data. Multi-tenant isolation, encryption, compliance, and incident response.',
};

/* ------------------------------------------------------------------ */
/*  Reusable card component for feature badges                         */
/* ------------------------------------------------------------------ */
function SecurityCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E7E0D5] bg-white p-6 hover:border-[#C4A77D]/40 hover:shadow-lg hover:shadow-[#C4A77D]/5 transition-all">
      <div className="w-10 h-10 rounded-lg bg-[#C4A77D]/10 flex items-center justify-center mb-4">
        <Icon className="size-5 text-[#A68B5B]" />
      </div>
      <h3 className="text-base font-semibold text-[#1C1917] mb-2">{title}</h3>
      <div className="text-sm text-[#78716C] leading-relaxed">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Compliance badge component                                         */
/* ------------------------------------------------------------------ */
function ComplianceBadge({
  icon: Icon,
  label,
  status,
}: {
  icon: React.ElementType;
  label: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#E7E0D5] bg-white px-4 py-3">
      <div className="w-8 h-8 rounded-md bg-[#C4A77D]/10 flex items-center justify-center shrink-0">
        <Icon className="size-4 text-[#A68B5B]" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#1C1917]">{label}</p>
        <p className="text-xs text-[#A8A29E]">{status}</p>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-20">
      {/* Hero Header */}
      <div className="border-b border-[#E7E0D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#78716C] hover:text-[#1C1917] transition-colors mb-6"
          >
            <ArrowLeft className="size-3.5" />
            Back to Home
          </Link>
          <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">
            Security
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4 max-w-2xl">
            Enterprise-grade security for{' '}
            <span className="text-[#C4A77D]">critical infrastructure data</span>
          </h1>
          <p className="text-base text-[#78716C] max-w-2xl mb-6">
            Altaviz is purpose-built to protect sensitive pipeline telemetry and SCADA data.
            Every layer of our platform — from data ingestion to dashboard delivery — is
            designed with defense-in-depth security principles.
          </p>
          <div className="flex items-center gap-2 text-xs text-[#A8A29E]">
            <Shield className="size-3.5 text-[#C4A77D]" />
            <span>Last updated: February 2026</span>
          </div>
        </div>
      </div>

      {/* Core Security Features — 2x3 grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">
          Platform Security
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-10">
          Built secure from the ground up
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <SecurityCard icon={Lock} title="Data Encryption">
            All data is encrypted in transit using TLS 1.3 and at rest using AES-256
            encryption managed by Supabase. Database connections require SSL certificates,
            and all API communication occurs over HTTPS with no exceptions.
          </SecurityCard>

          <SecurityCard icon={Layers} title="Multi-Tenant Isolation">
            Every database query is scoped to your organization via parameterized SQL
            statements. Organization ID columns carry NOT NULL constraints, and row-level
            filtering ensures no cross-tenant data access is possible through any API
            endpoint or database view.
          </SecurityCard>

          <SecurityCard icon={Fingerprint} title="Authentication">
            NextAuth.js v5 powers our authentication layer with GitHub and Google OAuth
            providers. JWT tokens expire after 8 hours and are enriched with organization
            context, role, and subscription tier. Enterprise customers can integrate
            Microsoft Entra ID and custom SAML providers.
          </SecurityCard>

          <SecurityCard icon={Users} title="Role-Based Access Control">
            Four role levels — Owner, Admin, Operator, and Viewer — provide granular access
            control. Owners manage billing and team membership. Admins configure alerts and
            thresholds. Operators acknowledge alerts and manage work orders. Viewers have
            read-only access to dashboards and reports.
          </SecurityCard>

          <SecurityCard icon={ShieldCheck} title="API Security">
            All API endpoints are protected by rate limiting: 60 requests per minute for
            general endpoints and 10 requests per minute for authentication endpoints.
            Every SQL query uses parameterized statements (never string interpolation), and
            all compressor ID inputs are validated against a strict regex pattern.
          </SecurityCard>

          <SecurityCard icon={ClipboardList} title="Audit Logging">
            Every data access, configuration change, alert acknowledgment, and
            administrative action is logged to our audit_logs table with timestamp, user
            identity, action type, and affected resource. Audit logs are immutable and
            retained per your subscription agreement.
          </SecurityCard>
        </div>
      </section>

      {/* Infrastructure Section */}
      <section className="border-t border-[#E7E0D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">
            Infrastructure
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-10">
            Trusted infrastructure partners
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <SecurityCard icon={Globe} title="Vercel Edge Network">
              Our application is deployed on Vercel&apos;s global edge network with automatic
              SSL provisioning, DDoS protection, and standalone Next.js builds. The edge
              network ensures low-latency dashboard delivery to field offices and
              operations centers worldwide.
            </SecurityCard>

            <SecurityCard icon={Database} title="Supabase PostgreSQL">
              All persistent data is stored in Supabase-managed PostgreSQL with TLS-encrypted
              connections, automated backups, and AES-256 encryption at rest. The database
              runs in a dedicated environment with network-level isolation.
            </SecurityCard>

            <SecurityCard icon={CreditCard} title="Stripe Billing">
              Payment processing is handled entirely by Stripe, a PCI DSS Level 1 certified
              processor. Altaviz never stores, processes, or transmits credit card numbers
              or payment credentials. Stripe webhook events are verified using signed
              secrets with idempotent processing.
            </SecurityCard>
          </div>
        </div>
      </section>

      {/* SCADA Data Handling */}
      <section className="border-t border-[#E7E0D5] bg-[#F5F0E8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div>
              <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">
                SCADA Data Handling
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4">
                How we protect your pipeline telemetry
              </h2>
              <p className="text-sm text-[#78716C] leading-relaxed mb-6">
                Pipeline sensor data is among the most sensitive operational information in
                the energy sector. Our data handling practices are designed specifically for
                SCADA and industrial telemetry workflows.
              </p>
              <ul className="space-y-3">
                {[
                  'Sensor data is ingested through a dedicated ETL pipeline with schema validation at every stage (Bronze, Silver, Gold)',
                  'All data is tagged with your organization ID at the point of ingestion — before any processing occurs',
                  'ML models (anomaly detection, temperature drift, RUL, emissions) process data exclusively within your tenant boundary',
                  'Database views enforce organization-scoped access as a secondary isolation layer at the PostgreSQL level',
                  'Hourly aggregation reduces raw data volume by ~83% while preserving all diagnostic fidelity',
                  'No cross-tenant data access is architecturally possible — organization scoping is enforced in every query function',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[#78716C]">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#E7E0D5] bg-white p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-md bg-[#C4A77D]/10 flex items-center justify-center">
                    <Server className="size-4 text-[#A68B5B]" />
                  </div>
                  <p className="text-sm font-semibold text-[#1C1917]">Data Pipeline</p>
                </div>
                <div className="space-y-2 text-xs text-[#78716C]">
                  <div className="flex items-center justify-between py-1.5 border-b border-[#E7E0D5]/60">
                    <span>Ingestion</span>
                    <span className="font-mono text-[#A68B5B]">Schema-validated</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#E7E0D5]/60">
                    <span>Processing</span>
                    <span className="font-mono text-[#A68B5B]">Org-scoped</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#E7E0D5]/60">
                    <span>Storage</span>
                    <span className="font-mono text-[#A68B5B]">AES-256 encrypted</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#E7E0D5]/60">
                    <span>Access</span>
                    <span className="font-mono text-[#A68B5B]">Parameterized SQL</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span>Audit</span>
                    <span className="font-mono text-[#A68B5B]">Full trail logged</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E7E0D5] bg-white p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-md bg-[#C4A77D]/10 flex items-center justify-center">
                    <Eye className="size-4 text-[#A68B5B]" />
                  </div>
                  <p className="text-sm font-semibold text-[#1C1917]">Security Headers</p>
                </div>
                <div className="space-y-2 text-xs text-[#78716C]">
                  <div className="flex items-center justify-between py-1.5 border-b border-[#E7E0D5]/60">
                    <span>Content-Security-Policy</span>
                    <span className="font-mono text-[#A68B5B]">Enforced</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#E7E0D5]/60">
                    <span>Strict-Transport-Security</span>
                    <span className="font-mono text-[#A68B5B]">max-age=31536000</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#E7E0D5]/60">
                    <span>X-Frame-Options</span>
                    <span className="font-mono text-[#A68B5B]">DENY</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span>Permissions-Policy</span>
                    <span className="font-mono text-[#A68B5B]">Restricted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="border-t border-[#E7E0D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">
            Compliance
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4">
            Industry-specific regulatory alignment
          </h2>
          <p className="text-sm text-[#78716C] leading-relaxed max-w-2xl mb-8">
            Altaviz is designed to support compliance with the regulatory frameworks that
            govern pipeline operations in the United States.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ComplianceBadge
              icon={FileCheck}
              label="49 CFR 192"
              status="Pipeline safety and integrity management"
            />
            <ComplianceBadge
              icon={FileCheck}
              label="49 CFR 195"
              status="Hazardous liquid pipeline integrity"
            />
            <ComplianceBadge
              icon={Leaf}
              label="EPA Subpart W"
              status="Methane emissions monitoring and reporting"
            />
            <ComplianceBadge
              icon={Shield}
              label="SOC 2 Type II"
              status="In progress — expected Q3 2026"
            />
            <ComplianceBadge
              icon={Activity}
              label="ISO 10816"
              status="Vibration severity evaluation"
            />
            <ComplianceBadge
              icon={Lock}
              label="SSO / SAML"
              status="Enterprise identity federation"
            />
          </div>
        </div>
      </section>

      {/* Incident Response & Vulnerability Disclosure */}
      <section className="border-t border-[#E7E0D5] bg-[#F5F0E8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Incident Response */}
            <div className="rounded-xl border border-[#E7E0D5] bg-white p-6 sm:p-8">
              <div className="w-10 h-10 rounded-lg bg-[#C4A77D]/10 flex items-center justify-center mb-4">
                <Bell className="size-5 text-[#A68B5B]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1C1917] mb-4">
                Incident Response
              </h3>
              <p className="text-sm text-[#78716C] leading-relaxed mb-4">
                Our incident response process is designed to detect, contain, and resolve
                security events as quickly as possible while keeping you informed.
              </p>
              <ol className="space-y-3">
                {[
                  {
                    step: 'Detection',
                    desc: 'Automated monitoring and anomaly detection on all infrastructure and application layers.',
                  },
                  {
                    step: 'Containment',
                    desc: 'Immediate isolation of affected systems to prevent further exposure or data loss.',
                  },
                  {
                    step: 'Notification',
                    desc: 'Affected customers are notified within 72 hours of confirmed data breach, per GDPR requirements.',
                  },
                  {
                    step: 'Resolution',
                    desc: 'Root cause analysis, remediation, and deployment of preventive measures.',
                  },
                  {
                    step: 'Post-mortem',
                    desc: 'Detailed incident report shared with affected customers, including timeline, impact, and preventive actions.',
                  },
                ].map(({ step, desc }, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#C4A77D]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-[#A68B5B]">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1C1917]">{step}</p>
                      <p className="text-xs text-[#78716C] leading-snug mt-0.5">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Vulnerability Disclosure & Pen Testing */}
            <div className="space-y-8">
              <div className="rounded-xl border border-[#E7E0D5] bg-white p-6 sm:p-8">
                <div className="w-10 h-10 rounded-lg bg-[#C4A77D]/10 flex items-center justify-center mb-4">
                  <Bug className="size-5 text-[#A68B5B]" />
                </div>
                <h3 className="text-xl font-semibold text-[#1C1917] mb-4">
                  Vulnerability Disclosure
                </h3>
                <p className="text-sm text-[#78716C] leading-relaxed mb-4">
                  We welcome responsible disclosure of security vulnerabilities. If you
                  discover a potential security issue, please report it to us promptly. We
                  ask that you:
                </p>
                <ul className="space-y-2 text-sm text-[#78716C] leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    Report vulnerabilities via email to{' '}
                    <a
                      href="mailto:security@altaviz.com"
                      className="text-[#C4A77D] hover:text-[#A68B5B] transition-colors"
                    >
                      security@altaviz.com
                    </a>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    Allow reasonable time for investigation before public disclosure
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    Do not access or modify other users&apos; data during testing
                  </li>
                </ul>
                <p className="text-sm text-[#78716C] leading-relaxed mt-4">
                  We commit to acknowledging receipt within 48 hours and providing a
                  substantive response within 5 business days.
                </p>
              </div>

              <div className="rounded-xl border border-[#E7E0D5] bg-white p-6 sm:p-8">
                <div className="w-10 h-10 rounded-lg bg-[#C4A77D]/10 flex items-center justify-center mb-4">
                  <Key className="size-5 text-[#A68B5B]" />
                </div>
                <h3 className="text-xl font-semibold text-[#1C1917] mb-4">
                  Penetration Testing
                </h3>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  Altaviz conducts annual third-party penetration testing of our application
                  and infrastructure. The next assessment is planned for Q2 2026. Enterprise
                  customers may request a summary of the most recent penetration test
                  findings and remediation status by contacting{' '}
                  <a
                    href="mailto:security@altaviz.com"
                    className="text-[#C4A77D] hover:text-[#A68B5B] transition-colors"
                  >
                    security@altaviz.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="border-t border-[#E7E0D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="rounded-2xl border border-[#E7E0D5] bg-white p-8 sm:p-10 text-center max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-xl bg-[#C4A77D]/10 flex items-center justify-center mx-auto mb-5">
              <Shield className="size-6 text-[#A68B5B]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1C1917] mb-3">
              Have a security question?
            </h2>
            <p className="text-sm text-[#78716C] leading-relaxed mb-6">
              Our security team is available to answer questions, provide documentation, or
              discuss your organization&apos;s specific compliance requirements.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:security@altaviz.com"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[#1C1917] hover:bg-[#2D2D2D] transition-colors px-6 py-3 rounded-full"
              >
                Contact Security Team
              </a>
              <Link
                href="/privacy"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#78716C] hover:text-[#1C1917] transition-colors px-6 py-3"
              >
                Read Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { Shield, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - Altaviz',
  description:
    'How Altaviz collects, uses, and protects your data. SCADA telemetry isolation, GDPR and CCPA compliance, and your data rights.',
};

const TOC = [
  { id: 'information-we-collect', label: 'Information We Collect' },
  { id: 'how-we-use-your-data', label: 'How We Use Your Data' },
  { id: 'pipeline-data-isolation', label: 'Pipeline Data Isolation' },
  { id: 'data-sharing', label: 'Data Sharing' },
  { id: 'data-retention', label: 'Data Retention' },
  { id: 'your-rights', label: 'Your Rights' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'security', label: 'Security' },
  { id: 'children', label: "Children's Privacy" },
  { id: 'changes', label: 'Changes to This Policy' },
  { id: 'contact', label: 'Contact Us' },
];

export default function PrivacyPage() {
  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-20">
      {/* Header */}
      <div className="border-b border-[#E7E0D5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[#78716C] hover:text-[#1C1917] transition-colors mb-6"
          >
            <ArrowLeft className="size-3.5" />
            Back to Home
          </Link>
          <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">
            Legal
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-3">
            Privacy Policy
          </h1>
          <p className="text-base text-[#78716C] max-w-2xl">
            At Altaviz, we take the privacy and security of your data seriously — especially
            when it involves critical infrastructure telemetry. This policy explains how we
            collect, use, and protect your information.
          </p>
          <div className="flex items-center gap-2 mt-5 text-xs text-[#A8A29E]">
            <Shield className="size-3.5 text-[#C4A77D]" />
            <span>Effective date: February 1, 2026</span>
            <span className="text-[#E7E0D5]">|</span>
            <span>Last updated: February 2026</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Sidebar TOC — sticky on desktop */}
          <aside className="lg:w-56 shrink-0">
            <nav className="lg:sticky lg:top-28">
              <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">
                On this page
              </p>
              <ul className="space-y-1.5">
                {TOC.map(({ id, label }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="block text-sm text-[#78716C] hover:text-[#1C1917] transition-colors py-0.5"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 max-w-3xl">
            <div className="prose-custom space-y-12">
              {/* 1. Information We Collect */}
              <section id="information-we-collect">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  1. Information We Collect
                </h2>

                <h3 className="text-base font-medium text-[#1C1917] mt-6 mb-2">
                  Account Information
                </h3>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  When you create an Altaviz account, we collect your name, email address,
                  organization name, and role within your company. If you sign in via GitHub or
                  Google OAuth, we receive the profile information those providers share
                  (display name, email, and profile image).
                </p>

                <h3 className="text-base font-medium text-[#1C1917] mt-6 mb-2">
                  SCADA and Sensor Telemetry
                </h3>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  Our core service ingests pipeline and compressor sensor data including, but not
                  limited to, vibration readings, temperature measurements, pressure readings,
                  flow rates, and equipment metadata. This data is provided by your organization
                  through our ingestion pipeline or API and is processed exclusively for the
                  purposes described in this policy.
                </p>

                <h3 className="text-base font-medium text-[#1C1917] mt-6 mb-2">
                  Usage Analytics
                </h3>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  We collect information about how you interact with the Altaviz platform,
                  including pages visited, features used, dashboard configurations, and alert
                  management actions. This helps us improve the product and provide better
                  support.
                </p>

                <h3 className="text-base font-medium text-[#1C1917] mt-6 mb-2">
                  Cookies and Technical Data
                </h3>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  We collect standard technical information such as browser type, operating
                  system, IP address, and device identifiers. Cookies are used for session
                  management and user preferences. See the Cookies section below for details.
                </p>
              </section>

              {/* 2. How We Use Your Data */}
              <section id="how-we-use-your-data">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  2. How We Use Your Data
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-4">
                  We use the information we collect for the following purposes:
                </p>
                <ul className="space-y-2.5">
                  {[
                    {
                      title: 'Service delivery',
                      desc: 'Processing sensor data through our ETL pipeline, generating alerts, running ML models for anomaly detection, temperature drift prediction, remaining useful life estimation, and emissions calculations.',
                    },
                    {
                      title: 'ML model training',
                      desc: 'Your organization\'s sensor data may be used to train and improve machine learning models that run within your organization\'s tenant. Models are never trained on cross-tenant data without explicit written consent.',
                    },
                    {
                      title: 'Compliance reporting',
                      desc: 'Generating reports required for 49 CFR 192, 49 CFR 195, EPA Subpart W, and other regulatory frameworks as configured by your organization.',
                    },
                    {
                      title: 'Platform improvement',
                      desc: 'Aggregated, anonymized usage data helps us improve platform performance, user experience, and feature prioritization.',
                    },
                    {
                      title: 'Communication',
                      desc: 'Sending service notifications, alert escalations, billing updates, and product announcements. You may opt out of non-essential communications at any time.',
                    },
                  ].map(({ title, desc }) => (
                    <li key={title} className="text-sm text-[#78716C] leading-relaxed">
                      <span className="font-medium text-[#1C1917]">{title}:</span> {desc}
                    </li>
                  ))}
                </ul>
              </section>

              {/* 3. Pipeline Data Isolation */}
              <section id="pipeline-data-isolation">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  3. Pipeline Data Isolation
                </h2>
                <div className="rounded-xl border border-[#C4A77D]/30 bg-[#C4A77D]/5 p-5 mb-4">
                  <p className="text-sm text-[#1C1917] font-medium mb-2">
                    Your SCADA and sensor data is strictly isolated.
                  </p>
                  <p className="text-sm text-[#78716C] leading-relaxed">
                    Altaviz is built on a multi-tenant architecture where every database query is
                    scoped to your organization. All columns that reference organization data
                    carry NOT NULL constraints, and all API endpoints enforce organization-level
                    filtering before data is returned.
                  </p>
                </div>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  Specifically, the following safeguards are in place:
                </p>
                <ul className="space-y-2 text-sm text-[#78716C] leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    All sensor readings, alerts, and maintenance records are filtered by
                    organization_id in every query — no exceptions.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    Database views enforce organization scoping at the PostgreSQL level,
                    providing a secondary layer of isolation.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    No cross-tenant data access is possible through the API. All SQL queries
                    use parameterized statements to prevent injection attacks.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    ML models process data within the boundary of your organization. Anomaly
                    detection, temperature drift, and RUL predictions are computed per-tenant.
                  </li>
                </ul>
              </section>

              {/* 4. Data Sharing */}
              <section id="data-sharing">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  4. Data Sharing
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-4">
                  We do not sell, rent, or trade your personal information or sensor data. We
                  share data only in the following limited circumstances:
                </p>
                <ul className="space-y-2.5 text-sm text-[#78716C] leading-relaxed">
                  <li>
                    <span className="font-medium text-[#1C1917]">With your explicit consent:</span>{' '}
                    We will share data with third parties only when you have given explicit written
                    authorization.
                  </li>
                  <li>
                    <span className="font-medium text-[#1C1917]">Payment processing:</span>{' '}
                    Stripe processes subscription payments on our behalf. Stripe is PCI DSS Level 1
                    certified and receives only the billing information necessary to process
                    transactions. Stripe does not have access to your sensor or operational data.
                  </li>
                  <li>
                    <span className="font-medium text-[#1C1917]">Infrastructure providers:</span>{' '}
                    Supabase hosts our PostgreSQL database, and Vercel hosts our application.
                    These providers process data under strict data processing agreements and do
                    not access your data for their own purposes.
                  </li>
                  <li>
                    <span className="font-medium text-[#1C1917]">Legal requirements:</span>{' '}
                    We may disclose information if required by law, regulation, subpoena, or court
                    order. We will notify you of such requests when legally permitted.
                  </li>
                </ul>
              </section>

              {/* 5. Data Retention */}
              <section id="data-retention">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  5. Data Retention
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-4">
                  We retain your data based on your subscription tier and contractual
                  obligations:
                </p>
                <div className="rounded-xl border border-[#E7E0D5] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F5F0E8]">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
                          Tier
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
                          Data Retention
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
                          After Cancellation
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E0D5]">
                      <tr>
                        <td className="py-3 px-4 text-[#1C1917] font-medium">Free</td>
                        <td className="py-3 px-4 text-[#78716C]">30 days</td>
                        <td className="py-3 px-4 text-[#78716C]">Deleted after 30 days</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-[#1C1917] font-medium">Pro</td>
                        <td className="py-3 px-4 text-[#78716C]">1 year</td>
                        <td className="py-3 px-4 text-[#78716C]">Export available for 30 days, then deleted</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-[#1C1917] font-medium">Enterprise</td>
                        <td className="py-3 px-4 text-[#78716C]">Unlimited (per contract)</td>
                        <td className="py-3 px-4 text-[#78716C]">Export available for 30 days, then deleted per agreement</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-[#78716C] leading-relaxed mt-3">
                  Account information (name, email, organization) is retained for the duration of
                  your account. After account deletion, personal data is removed within 30 days.
                  Anonymized, aggregated analytics data may be retained indefinitely.
                </p>
              </section>

              {/* 6. Your Rights */}
              <section id="your-rights">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  6. Your Rights
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-4">
                  Depending on your jurisdiction, you may have the following rights under
                  applicable data protection laws including the GDPR and CCPA:
                </p>
                <ul className="space-y-2.5 text-sm text-[#78716C] leading-relaxed">
                  <li>
                    <span className="font-medium text-[#1C1917]">Right of access:</span>{' '}
                    Request a copy of the personal data we hold about you and your organization.
                  </li>
                  <li>
                    <span className="font-medium text-[#1C1917]">Right to correction:</span>{' '}
                    Request correction of inaccurate or incomplete personal data.
                  </li>
                  <li>
                    <span className="font-medium text-[#1C1917]">Right to deletion:</span>{' '}
                    Request deletion of your personal data, subject to legal retention
                    requirements.
                  </li>
                  <li>
                    <span className="font-medium text-[#1C1917]">Right to data portability:</span>{' '}
                    Request an export of your data in a machine-readable format (JSON or CSV).
                  </li>
                  <li>
                    <span className="font-medium text-[#1C1917]">Right to restrict processing:</span>{' '}
                    Request that we limit the processing of your data in certain circumstances.
                  </li>
                  <li>
                    <span className="font-medium text-[#1C1917]">Right to object:</span>{' '}
                    Object to data processing based on legitimate interests or for direct
                    marketing.
                  </li>
                  <li>
                    <span className="font-medium text-[#1C1917]">CCPA rights:</span>{' '}
                    California residents have the right to know what personal information is
                    collected, to delete personal information, to opt out of the sale of personal
                    information (we do not sell personal information), and to non-discrimination
                    for exercising these rights.
                  </li>
                </ul>
                <p className="text-sm text-[#78716C] leading-relaxed mt-4">
                  To exercise any of these rights, contact us at{' '}
                  <a
                    href="mailto:privacy@altaviz.com"
                    className="text-[#C4A77D] hover:text-[#A68B5B] transition-colors"
                  >
                    privacy@altaviz.com
                  </a>
                  . We will respond to your request within 30 days.
                </p>
              </section>

              {/* 7. Cookies */}
              <section id="cookies">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  7. Cookies
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-4">
                  We use a limited set of cookies to operate the platform. We do not use
                  third-party tracking cookies or sell cookie data to advertisers.
                </p>
                <div className="rounded-xl border border-[#E7E0D5] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F5F0E8]">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
                          Cookie
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
                          Purpose
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E0D5]">
                      <tr>
                        <td className="py-3 px-4 text-[#1C1917] font-medium font-mono text-xs">
                          session_token
                        </td>
                        <td className="py-3 px-4 text-[#78716C]">Authentication session management</td>
                        <td className="py-3 px-4 text-[#78716C]">8 hours</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-[#1C1917] font-medium font-mono text-xs">
                          preferences
                        </td>
                        <td className="py-3 px-4 text-[#78716C]">Theme, dashboard layout, and display settings</td>
                        <td className="py-3 px-4 text-[#78716C]">1 year</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-[#1C1917] font-medium font-mono text-xs">
                          analytics_id
                        </td>
                        <td className="py-3 px-4 text-[#78716C]">Anonymous usage analytics (first-party only)</td>
                        <td className="py-3 px-4 text-[#78716C]">30 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-[#78716C] leading-relaxed mt-3">
                  All cookies are httpOnly and secure in production environments, with sameSite
                  set to lax. You may disable cookies in your browser settings, but this may
                  affect platform functionality.
                </p>
              </section>

              {/* 8. Security */}
              <section id="security">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  8. Security
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="space-y-2 text-sm text-[#78716C] leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    TLS 1.3 encryption for all data in transit
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    AES-256 encryption for data at rest (managed by Supabase)
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    JWT-based authentication with 8-hour token expiry
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    Rate limiting on all API endpoints (60 req/min general, 10 req/min auth)
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    Full audit logging of all data access and configuration changes
                  </li>
                </ul>
                <p className="text-sm text-[#78716C] leading-relaxed mt-3">
                  We are actively pursuing SOC 2 Type II certification. For more details, see
                  our{' '}
                  <Link
                    href="/security"
                    className="text-[#C4A77D] hover:text-[#A68B5B] transition-colors"
                  >
                    Security Policy
                  </Link>
                  .
                </p>
              </section>

              {/* 9. Children's Privacy */}
              <section id="children">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  9. Children&apos;s Privacy
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  Altaviz is a business-to-business platform designed for use by professionals in
                  the oil and gas industry. We do not knowingly collect personal information from
                  individuals under the age of 16. If we become aware that we have collected data
                  from a person under 16, we will promptly delete that information. If you
                  believe a minor has provided personal data to us, please contact us at{' '}
                  <a
                    href="mailto:privacy@altaviz.com"
                    className="text-[#C4A77D] hover:text-[#A68B5B] transition-colors"
                  >
                    privacy@altaviz.com
                  </a>
                  .
                </p>
              </section>

              {/* 10. Changes to This Policy */}
              <section id="changes">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  10. Changes to This Policy
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  We may update this Privacy Policy from time to time to reflect changes in our
                  practices or applicable law. We will provide at least 30 days&apos; notice before
                  any material changes take effect, via email to your account address and a
                  prominent notice on the platform. The &quot;Last updated&quot; date at the top of this
                  page indicates when the policy was most recently revised. Continued use of the
                  platform after the effective date of a revised policy constitutes acceptance of
                  the changes.
                </p>
              </section>

              {/* 11. Contact Us */}
              <section id="contact">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  11. Contact Us
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-4">
                  If you have any questions about this Privacy Policy or our data practices,
                  please contact us:
                </p>
                <div className="rounded-xl border border-[#E7E0D5] bg-[#F5F0E8] p-5">
                  <p className="text-sm font-medium text-[#1C1917] mb-1">
                    Altaviz, Inc.
                  </p>
                  <p className="text-sm text-[#78716C] leading-relaxed">
                    Houston, TX
                    <br />
                    Email:{' '}
                    <a
                      href="mailto:privacy@altaviz.com"
                      className="text-[#C4A77D] hover:text-[#A68B5B] transition-colors"
                    >
                      privacy@altaviz.com
                    </a>
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { Scale, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service - Altaviz',
  description:
    'Altaviz terms of service for pipeline integrity management SaaS. Subscription terms, data ownership, ML disclaimers, and SLA commitments.',
};

const TOC = [
  { id: 'acceptance', label: 'Acceptance of Terms' },
  { id: 'service-description', label: 'Service Description' },
  { id: 'account-registration', label: 'Account Registration' },
  { id: 'subscriptions', label: 'Subscriptions & Billing' },
  { id: 'acceptable-use', label: 'Acceptable Use' },
  { id: 'intellectual-property', label: 'Intellectual Property' },
  { id: 'data-ownership', label: 'Data Ownership' },
  { id: 'ml-disclaimer', label: 'ML Model Disclaimer' },
  { id: 'sla', label: 'Service Level Agreement' },
  { id: 'limitation-of-liability', label: 'Limitation of Liability' },
  { id: 'indemnification', label: 'Indemnification' },
  { id: 'termination', label: 'Termination' },
  { id: 'dispute-resolution', label: 'Dispute Resolution' },
  { id: 'force-majeure', label: 'Force Majeure' },
  { id: 'governing-law', label: 'Governing Law' },
  { id: 'contact', label: 'Contact Us' },
];

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-base text-[#78716C] max-w-2xl">
            These Terms of Service govern your use of the Altaviz platform. By accessing or
            using our services, you agree to be bound by these terms. Please read them
            carefully.
          </p>
          <div className="flex items-center gap-2 mt-5 text-xs text-[#A8A29E]">
            <Scale className="size-3.5 text-[#C4A77D]" />
            <span>Effective date: February 1, 2026</span>
            <span className="text-[#E7E0D5]">|</span>
            <span>Last updated: February 2026</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Sidebar TOC */}
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
            <div className="space-y-12">
              {/* 1. Acceptance of Terms */}
              <section id="acceptance">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  1. Acceptance of Terms
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  By accessing or using the Altaviz platform (&quot;Service&quot;), you agree to be bound
                  by these Terms of Service (&quot;Terms&quot;). If you are using the Service on behalf of
                  an organization, you represent and warrant that you have the authority to bind
                  that organization to these Terms, and &quot;you&quot; refers to both you individually and
                  the organization.
                </p>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  If you do not agree to these Terms, you may not access or use the Service. We
                  reserve the right to modify these Terms at any time with at least 30 days&apos;
                  notice. Your continued use of the Service after such modifications constitutes
                  acceptance of the updated Terms.
                </p>
              </section>

              {/* 2. Service Description */}
              <section id="service-description">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  2. Service Description
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  Altaviz is a cloud-based pipeline integrity management platform that provides:
                </p>
                <ul className="space-y-2 text-sm text-[#78716C] leading-relaxed ml-4 list-disc">
                  <li>Real-time monitoring of compressor and pipeline sensor data (vibration, temperature, pressure, flow rates)</li>
                  <li>Machine learning-powered predictive analytics including anomaly detection, temperature drift prediction, remaining useful life estimation, and emissions calculations</li>
                  <li>Alert management with automated escalation, auto-resolution, and data freshness monitoring</li>
                  <li>Regulatory compliance reporting for 49 CFR 192, 49 CFR 195, and EPA Subpart W</li>
                  <li>Multi-tenant dashboards with role-based access control</li>
                  <li>Data ingestion via ETL pipeline (PySpark) and REST API</li>
                </ul>
                <p className="text-sm text-[#78716C] leading-relaxed mt-3">
                  The Service is provided on a subscription basis as described in Section 4.
                  Feature availability varies by subscription tier.
                </p>
              </section>

              {/* 3. Account Registration */}
              <section id="account-registration">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  3. Account Registration
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  To use the Service, you must create an account by providing accurate and
                  complete information. When you register, an organization is automatically
                  created for your account. As the initial user, you are designated the
                  organization Owner.
                </p>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  You are responsible for:
                </p>
                <ul className="space-y-2 text-sm text-[#78716C] leading-relaxed ml-4 list-disc">
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account or organization</li>
                  <li>Ensuring that authorized users within your organization comply with these Terms</li>
                  <li>Managing user roles and permissions within your organization (Owner, Admin, Operator, Viewer)</li>
                  <li>Promptly notifying us of any unauthorized access to your account</li>
                </ul>
                <p className="text-sm text-[#78716C] leading-relaxed mt-3">
                  Authentication is provided through GitHub OAuth, Google OAuth, or approved
                  enterprise SSO providers. We do not store passwords directly.
                </p>
              </section>

              {/* 4. Subscriptions & Billing */}
              <section id="subscriptions">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  4. Subscriptions and Billing
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-4">
                  The Service is offered under the following subscription tiers:
                </p>
                <div className="rounded-xl border border-[#E7E0D5] overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F5F0E8]">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
                          Tier
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
                          Price
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
                          Includes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E0D5]">
                      <tr>
                        <td className="py-3 px-4 text-[#1C1917] font-medium">Free</td>
                        <td className="py-3 px-4 text-[#78716C]">$0/month</td>
                        <td className="py-3 px-4 text-[#78716C]">2 compressors, 1-hour data window</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-[#1C1917] font-medium">Pro</td>
                        <td className="py-3 px-4 text-[#78716C]">$49/month</td>
                        <td className="py-3 px-4 text-[#78716C]">20 compressors, all data windows</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-[#1C1917] font-medium">Enterprise</td>
                        <td className="py-3 px-4 text-[#78716C]">$199/month</td>
                        <td className="py-3 px-4 text-[#78716C]">Unlimited compressors, ML predictions, priority support</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  All billing is processed through Stripe. By subscribing to a paid tier, you
                  authorize Stripe to charge your designated payment method on a recurring monthly
                  basis. You may upgrade, downgrade, or cancel your subscription at any time
                  through the billing settings in your dashboard.
                </p>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  Downgrades take effect at the end of the current billing period. If a payment
                  fails, we will attempt to charge the payment method again. After three
                  consecutive failed attempts, your account may be downgraded to the Free tier.
                </p>
              </section>

              {/* 5. Acceptable Use */}
              <section id="acceptable-use">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  5. Acceptable Use
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  You agree to use the Service only for lawful purposes and in accordance with
                  these Terms. You may not:
                </p>
                <ul className="space-y-2 text-sm text-[#78716C] leading-relaxed ml-4 list-disc">
                  <li>Reverse engineer, decompile, or disassemble any part of the Service, including ML models and algorithms</li>
                  <li>Attempt to gain unauthorized access to other organizations&apos; data or any systems connected to the Service</li>
                  <li>Use the Service to store or transmit malicious code, viruses, or harmful data</li>
                  <li>Circumvent or disable any security features, rate limits, or access controls</li>
                  <li>Use ML predictions or analytics output as a sole basis for safety-critical operational decisions without independent professional verification</li>
                  <li>Resell, sublicense, or redistribute the Service or any data derived from it without prior written consent</li>
                  <li>Exceed the compressor or data window limits of your subscription tier through technical workarounds</li>
                  <li>Use automated tools to scrape, crawl, or excessively load the Service beyond normal usage patterns</li>
                </ul>
                <p className="text-sm text-[#78716C] leading-relaxed mt-3">
                  Violation of these terms may result in immediate suspension or termination of
                  your account.
                </p>
              </section>

              {/* 6. Intellectual Property */}
              <section id="intellectual-property">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  6. Intellectual Property
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  Altaviz, Inc. owns all rights, title, and interest in and to the Service,
                  including but not limited to the software, algorithms, machine learning models,
                  user interface, documentation, and all intellectual property rights therein.
                </p>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  Your subscription grants you a limited, non-exclusive, non-transferable license
                  to access and use the Service for the duration of your subscription term, subject
                  to these Terms. This license does not grant you any rights to the underlying
                  technology, source code, or algorithms.
                </p>
              </section>

              {/* 7. Data Ownership */}
              <section id="data-ownership">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  7. Data Ownership
                </h2>
                <div className="rounded-xl border border-[#C4A77D]/30 bg-[#C4A77D]/5 p-5 mb-4">
                  <p className="text-sm text-[#1C1917] font-medium mb-2">
                    You own your data. Always.
                  </p>
                  <p className="text-sm text-[#78716C] leading-relaxed">
                    Your organization retains all rights, title, and interest in and to the SCADA
                    data, sensor telemetry, equipment metadata, and any other operational data you
                    upload to or process through the Service.
                  </p>
                </div>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  By using the Service, you grant Altaviz a limited license to process, store,
                  and analyze your data solely for the purpose of providing the Service to you.
                  This includes running your data through our ETL pipeline, ML models, and
                  generating alerts and reports.
                </p>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  We will not use your data for any purpose other than providing the Service
                  without your explicit written consent. We will not share your data with other
                  customers or use it to train models that benefit other tenants.
                </p>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  You may export your data at any time through the platform or by contacting
                  support. Upon termination, you will have 30 days to export your data before
                  it is permanently deleted.
                </p>
              </section>

              {/* 8. ML Model Disclaimer */}
              <section id="ml-disclaimer">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  8. Machine Learning Disclaimer
                </h2>
                <div className="rounded-xl border border-[#D62728]/20 bg-[#D62728]/5 p-5 mb-4">
                  <p className="text-sm text-[#1C1917] font-medium mb-2">
                    Important: Predictions are advisory only.
                  </p>
                  <p className="text-sm text-[#78716C] leading-relaxed">
                    ML-generated predictions, anomaly scores, temperature drift forecasts,
                    remaining useful life estimates, and emissions calculations are provided as
                    decision-support tools. They are not a substitute for professional engineering
                    judgment, physical inspections, or regulatory compliance programs.
                  </p>
                </div>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  Our machine learning models — including Isolation Forest anomaly detection,
                  linear regression temperature drift prediction, heuristic RUL estimation, and
                  EPA factor-based emissions calculation — are statistical tools that operate on
                  the data available to them. They may produce false positives, false negatives,
                  or inaccurate predictions, particularly when:
                </p>
                <ul className="space-y-2 text-sm text-[#78716C] leading-relaxed ml-4 list-disc">
                  <li>Sensor data is incomplete, delayed, or degraded</li>
                  <li>Equipment operates outside previously observed parameters</li>
                  <li>Environmental conditions change significantly</li>
                  <li>Insufficient historical data is available for training</li>
                </ul>
                <p className="text-sm text-[#78716C] leading-relaxed mt-3">
                  You are solely responsible for all operational decisions made using the Service.
                  Altaviz makes no warranty that predictions will prevent equipment failure,
                  environmental incidents, or regulatory violations. All maintenance, inspection,
                  and compliance activities must be conducted in accordance with applicable federal,
                  state, and local regulations, independent of any output from the Service.
                </p>
              </section>

              {/* 9. SLA */}
              <section id="sla">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  9. Service Level Agreement
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-4">
                  For Pro and Enterprise subscribers, Altaviz commits to a 99.9% monthly uptime
                  target for the core platform services (dashboard, API, alert delivery).
                </p>
                <div className="rounded-xl border border-[#E7E0D5] overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F5F0E8]">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
                          Monthly Uptime
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-[#1C1917] uppercase tracking-wider">
                          Service Credit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E0D5]">
                      <tr>
                        <td className="py-3 px-4 text-[#78716C]">99.0% - 99.9%</td>
                        <td className="py-3 px-4 text-[#78716C]">10% of monthly subscription</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-[#78716C]">95.0% - 99.0%</td>
                        <td className="py-3 px-4 text-[#78716C]">25% of monthly subscription</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-[#78716C]">Below 95.0%</td>
                        <td className="py-3 px-4 text-[#78716C]">50% of monthly subscription</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  Uptime is measured as the percentage of minutes in a calendar month during
                  which the core Service is available. Scheduled maintenance windows (announced
                  at least 48 hours in advance) and Force Majeure events are excluded from uptime
                  calculations.
                </p>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  The Free tier is provided on a best-effort basis and is not covered by this SLA.
                  Service credits must be requested within 30 days of the applicable month.
                </p>
              </section>

              {/* 10. Limitation of Liability */}
              <section id="limitation-of-liability">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  10. Limitation of Liability
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ALTAVIZ, INC., ITS
                  AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR
                  ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
                  INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, REVENUE, DATA, EQUIPMENT DAMAGE,
                  ENVIRONMENTAL DAMAGE, PERSONAL INJURY, OR BUSINESS INTERRUPTION, ARISING OUT OF
                  OR RELATED TO YOUR USE OF THE SERVICE.
                </p>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  IN NO EVENT SHALL ALTAVIZ&apos;S TOTAL AGGREGATE LIABILITY EXCEED THE AMOUNT PAID
                  BY YOU FOR THE SERVICE DURING THE TWELVE (12) MONTHS PRECEDING THE EVENT
                  GIVING RISE TO THE CLAIM.
                </p>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY
                  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES
                  OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                  ALTAVIZ DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR
                  FREE OF HARMFUL COMPONENTS.
                </p>
              </section>

              {/* 11. Indemnification */}
              <section id="indemnification">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  11. Indemnification
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  You agree to indemnify, defend, and hold harmless Altaviz, Inc., its affiliates,
                  officers, directors, employees, and agents from and against any claims, damages,
                  losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees)
                  arising out of or related to: (a) your use of the Service; (b) your violation
                  of these Terms; (c) your violation of any applicable law or regulation; (d) any
                  data you upload to the Service; or (e) operational decisions made based on the
                  Service&apos;s predictions or analytics output.
                </p>
              </section>

              {/* 12. Termination */}
              <section id="termination">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  12. Termination
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  Either party may terminate this agreement with 30 days&apos; written notice. Altaviz
                  may also terminate or suspend your access immediately if you materially breach
                  these Terms, engage in prohibited conduct, or fail to pay subscription fees
                  after reasonable notice.
                </p>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  Upon termination:
                </p>
                <ul className="space-y-2 text-sm text-[#78716C] leading-relaxed ml-4 list-disc">
                  <li>Your access to the Service will be revoked at the end of the notice period</li>
                  <li>You will have 30 days to export your data through the platform or by contacting support</li>
                  <li>After the 30-day export window, all your data will be permanently deleted from our systems</li>
                  <li>Any prepaid subscription fees for unused months will be refunded on a pro-rata basis</li>
                  <li>Sections that by their nature should survive termination (including Data Ownership, Limitation of Liability, Indemnification, and Governing Law) will remain in effect</li>
                </ul>
              </section>

              {/* 13. Dispute Resolution */}
              <section id="dispute-resolution">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  13. Dispute Resolution
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  Any dispute arising out of or relating to these Terms or the Service shall be
                  resolved through binding arbitration administered by the American Arbitration
                  Association (&quot;AAA&quot;) under its Commercial Arbitration Rules. The arbitration
                  shall take place in Houston, Texas, and shall be conducted by a single
                  arbitrator.
                </p>
                <p className="text-sm text-[#78716C] leading-relaxed mb-3">
                  Before initiating arbitration, the parties agree to attempt good-faith
                  negotiation for a period of 30 days. Notice of a dispute shall be sent to
                  the other party in writing.
                </p>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  The arbitrator&apos;s decision shall be final and binding, and judgment upon the
                  award may be entered in any court of competent jurisdiction. Each party shall
                  bear its own costs, and the arbitration fees shall be shared equally unless the
                  arbitrator determines otherwise. CLASS ACTION WAIVER: All disputes must be
                  brought in the parties&apos; individual capacity, and not as a plaintiff or class
                  member in any purported class or representative proceeding.
                </p>
              </section>

              {/* 14. Force Majeure */}
              <section id="force-majeure">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  14. Force Majeure
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  Neither party shall be liable for any failure or delay in performing its
                  obligations under these Terms due to circumstances beyond its reasonable
                  control, including but not limited to: acts of God, natural disasters,
                  pandemics, war, terrorism, government actions, power outages, internet service
                  disruptions, cyberattacks, or failures of third-party cloud infrastructure
                  providers. The affected party shall provide prompt notice and use commercially
                  reasonable efforts to mitigate the impact of the force majeure event.
                </p>
              </section>

              {/* 15. Governing Law */}
              <section id="governing-law">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  15. Governing Law
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of
                  the State of Texas, United States, without regard to its conflict of law
                  provisions. Any legal action not subject to arbitration shall be brought
                  exclusively in the state or federal courts located in Harris County, Texas,
                  and each party consents to the personal jurisdiction of such courts.
                </p>
              </section>

              {/* 16. Contact Us */}
              <section id="contact">
                <h2 className="text-xl font-semibold text-[#1C1917] mb-4">
                  16. Contact Us
                </h2>
                <p className="text-sm text-[#78716C] leading-relaxed mb-4">
                  If you have any questions about these Terms of Service, please contact us:
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
                      href="mailto:legal@altaviz.com"
                      className="text-[#C4A77D] hover:text-[#A68B5B] transition-colors"
                    >
                      legal@altaviz.com
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

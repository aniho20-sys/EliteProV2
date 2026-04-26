import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const LAST_UPDATED = '26 April 2026';
const CONTACT_EMAIL = 'elitepro616@gmail.com';
const CONTROLLER = 'Elitepro Team';

export default function PrivacyPolicyPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-back">
          <Link to="/" className="btn btn-outline btn-sm">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>

        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-meta">Last updated: {LAST_UPDATED} &nbsp;·&nbsp; Controller: {CONTROLLER}</p>

        <section className="legal-section">
          <h2>1. Who We Are</h2>
          <p>
            ElitePro is a fitness training management platform operated by <strong>{CONTROLLER}</strong>.
            We connect personal trainers with their clients to manage workout programming, session scheduling,
            progress tracking, and in-app communication.
          </p>
          <p>
            For privacy matters, contact us at:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Data We Collect</h2>

          <h3>Account &amp; Identity</h3>
          <ul>
            <li>Name and email address</li>
            <li>Profile photo (if you sign in with Google)</li>
            <li>Account role (trainer or client)</li>
          </ul>

          <h3>Profile Information</h3>
          <ul>
            <li><strong>Trainers:</strong> speciality, invite code</li>
            <li><strong>Clients:</strong> age, height (cm), fitness goals, trainer notes</li>
          </ul>

          <h3>Health &amp; Fitness Data</h3>
          <p>
            This is <strong>special category personal data</strong> under GDPR. We collect it only
            to provide the core service you signed up for.
          </p>
          <ul>
            <li>Body measurements: weight (kg), body fat (%), chest, waist, hips, arms, legs (cm)</li>
            <li>Workout plans assigned by your trainer</li>
            <li>Workout logs: exercises, sets, reps, weight lifted, rate of perceived exertion (RPE)</li>
            <li>Personal records (PRs) derived from your logs</li>
          </ul>

          <h3>Communications &amp; Scheduling</h3>
          <ul>
            <li>In-app messages between trainer and client</li>
            <li>Session bookings: date, time, type, status, notes</li>
          </ul>

          <h3>Financial Records (Trainers)</h3>
          <ul>
            <li>Invoice records between trainer and client (amount, status, date)</li>
          </ul>

          <h3>Technical Data</h3>
          <ul>
            <li>Firebase Authentication tokens (session management)</li>
            <li>App Check attestation tokens (abuse prevention via Google reCAPTCHA v3)</li>
            <li>Offline cache stored in your browser's IndexedDB (cleared on logout)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Why We Process Your Data</h2>
          <table className="legal-table">
            <thead>
              <tr><th>Purpose</th><th>Legal Basis</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Providing the platform (workout plans, logs, messaging, scheduling)</td>
                <td>Contract performance (Art. 6(1)(b) GDPR)</td>
              </tr>
              <tr>
                <td>Processing health &amp; body measurement data</td>
                <td>Explicit consent (Art. 9(2)(a) GDPR) — given when you create your account</td>
              </tr>
              <tr>
                <td>Security and abuse prevention (App Check, rate limiting)</td>
                <td>Legitimate interests (Art. 6(1)(f) GDPR)</td>
              </tr>
              <tr>
                <td>Sending push notifications (if you opt in)</td>
                <td>Consent (Art. 6(1)(a) GDPR)</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="legal-section">
          <h2>4. Third-Party Services</h2>
          <p>We use the following sub-processors. Your data may be transmitted to their servers.</p>
          <table className="legal-table">
            <thead>
              <tr><th>Service</th><th>Provider</th><th>Purpose</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Firebase Authentication</td>
                <td>Google LLC (US)</td>
                <td>User sign-in, session tokens</td>
              </tr>
              <tr>
                <td>Cloud Firestore</td>
                <td>Google LLC (US)</td>
                <td>All app data storage</td>
              </tr>
              <tr>
                <td>Firebase Hosting</td>
                <td>Google LLC (US)</td>
                <td>Serving the web app</td>
              </tr>
              <tr>
                <td>Firebase App Check + reCAPTCHA v3</td>
                <td>Google LLC (US)</td>
                <td>Bot &amp; abuse prevention</td>
              </tr>
              <tr>
                <td>Firebase Cloud Messaging</td>
                <td>Google LLC (US)</td>
                <td>Push notifications (opt-in)</td>
              </tr>
            </tbody>
          </table>
          <p>
            Google's privacy policy applies to these services:{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
              policies.google.com/privacy
            </a>
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Data Retention</h2>
          <ul>
            <li>Your data is retained while your account is active.</li>
            <li>
              When you delete your account, your Firestore profile and body stats are deleted immediately.
              Workout logs and messages are retained for record-keeping integrity (your trainer's records)
              and will be anonymised or purged within <strong>90 days</strong> via our scheduled deletion process.
            </li>
            <li>Invoice records may be retained for up to <strong>7 years</strong> to comply with accounting obligations.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Your Rights (GDPR)</h2>
          <p>If you are in the European Economic Area (EEA) or UK, you have the following rights:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data.</li>
            <li><strong>Rectification:</strong> Correct inaccurate data in your profile.</li>
            <li><strong>Erasure ("Right to be Forgotten"):</strong> Request deletion of your account and data.</li>
            <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
            <li><strong>Restriction:</strong> Request that we restrict processing in certain circumstances.</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests.</li>
            <li><strong>Withdraw Consent:</strong> Withdraw consent for health data processing at any time (this will require account deletion).</li>
          </ul>
          <p>
            To exercise any of these rights, email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will respond within 30 days.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. International Data Transfers</h2>
          <p>
            Data is stored on Google Cloud infrastructure, which may be located in the United States or
            other countries. Google participates in the EU–US Data Privacy Framework, providing adequate
            safeguards for international transfers.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Children</h2>
          <p>
            ElitePro is not intended for use by persons under the age of 16. We do not knowingly collect
            personal data from children. If you believe a child has provided us with personal data,
            contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we will delete it.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be communicated
            via in-app notification. Continued use of ElitePro after changes constitutes acceptance of
            the updated policy. The "Last updated" date at the top indicates when the latest revision
            was made.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Contact</h2>
          <p>
            Questions, complaints, or data requests:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
          <p>
            If you are in the EEA and believe we have not resolved your concern, you have the right to
            lodge a complaint with your local data protection authority.
          </p>
        </section>

        <div className="legal-footer">
          <Link to="/terms">Terms of Service</Link>
          <span>·</span>
          <Link to="/">Back to ElitePro</Link>
        </div>
      </div>
    </div>
  );
}

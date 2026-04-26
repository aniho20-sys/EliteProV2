import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const LAST_UPDATED = '26 April 2026';
const CONTACT_EMAIL = 'elitepro616@gmail.com';
const SERVICE_NAME = 'ElitePro';

export default function TermsPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-back">
          <Link to="/" className="btn btn-outline btn-sm">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>

        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-meta">Last updated: {LAST_UPDATED} &nbsp;·&nbsp; Operated by: Elitepro Team</p>

        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account or using {SERVICE_NAME} ("the Service", "we", "us"), you agree to be
            bound by these Terms of Service. If you do not agree, do not use the Service.
          </p>
          <p>
            These Terms apply to all users, including personal trainers ("Trainers") and their clients ("Clients").
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Description of Service</h2>
          <p>
            {SERVICE_NAME} is a web-based fitness training management platform that enables Trainers to:
          </p>
          <ul>
            <li>Create and assign workout plans to Clients</li>
            <li>Schedule and manage training sessions</li>
            <li>Track Client progress and body measurements</li>
            <li>Communicate with Clients via in-app messaging</li>
            <li>Manage invoices and session quotas</li>
          </ul>
          <p>
            Clients can log workouts, view assigned plans, track body stats, book sessions, and
            communicate with their Trainer.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Account Registration</h2>
          <ul>
            <li>You must provide accurate and complete information when creating an account.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You must be at least 16 years old to use the Service.</li>
            <li>
              One account per person. Sharing account credentials with others is not permitted.
            </li>
            <li>
              You are responsible for all activity that occurs under your account.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Trainer Responsibilities</h2>
          <p>If you use {SERVICE_NAME} as a Trainer, you agree to:</p>
          <ul>
            <li>
              Hold any relevant qualifications, certifications, or licences required by your
              jurisdiction to provide personal training services.
            </li>
            <li>
              Take full responsibility for the workout programmes you design and assign to Clients,
              including their safety and appropriateness for each individual Client.
            </li>
            <li>
              Obtain informed consent from Clients before collecting or recording their health
              and body measurement data.
            </li>
            <li>
              Keep Client data confidential and use it solely for delivering training services.
            </li>
            <li>
              Not use {SERVICE_NAME} to harass, coerce, or act unprofessionally toward Clients.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Client Responsibilities</h2>
          <p>If you use {SERVICE_NAME} as a Client, you agree to:</p>
          <ul>
            <li>
              Disclose to your Trainer any relevant medical conditions, injuries, or physical
              limitations before commencing a training programme.
            </li>
            <li>
              Consult a qualified medical professional before starting any new exercise programme,
              especially if you have pre-existing health conditions.
            </li>
            <li>
              Take responsibility for your own safety during workouts. {SERVICE_NAME} and your
              Trainer are not liable for injuries sustained during self-directed exercise.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Health Disclaimer</h2>
          <p>
            <strong>
              {SERVICE_NAME} is a management tool, not a medical service. Nothing on the platform
              constitutes medical advice, diagnosis, or treatment.
            </strong>
          </p>
          <p>
            Always seek the advice of a qualified physician or other health provider with any
            questions you may have regarding a medical condition or physical fitness programme.
            Never disregard professional medical advice or delay seeking it because of something
            you read or tracked on {SERVICE_NAME}.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose or in violation of any applicable law.</li>
            <li>Harass, abuse, or harm other users.</li>
            <li>
              Attempt to gain unauthorised access to any part of the Service or another user's account.
            </li>
            <li>
              Send spam, automated messages, or abuse the messaging or session booking features.
            </li>
            <li>
              Reverse engineer, decompile, or attempt to extract the source code of the Service.
            </li>
            <li>
              Use the Service in any way that could damage, overload, or impair its infrastructure.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>8. Intellectual Property</h2>
          <p>
            {SERVICE_NAME} and its original content, features, and functionality are owned by
            Elitepro Team and are protected by applicable intellectual property laws.
          </p>
          <p>
            You retain ownership of any content you create (workout programmes, notes, etc.).
            By uploading content to the Service, you grant us a limited licence to store and
            display it solely for the purpose of providing the Service to you.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Termination</h2>
          <p>
            You may delete your account at any time from the Profile page. Upon deletion,
            your profile and body stats are removed immediately. Workout logs and messages
            are subject to the retention schedule in our Privacy Policy.
          </p>
          <p>
            We reserve the right to suspend or terminate accounts that violate these Terms,
            without prior notice, at our sole discretion.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Disclaimer of Warranties</h2>
          <p>
            The Service is provided <strong>"as is"</strong> and <strong>"as available"</strong>,
            without warranties of any kind, either express or implied, including but not limited
            to implied warranties of merchantability, fitness for a particular purpose, or
            non-infringement.
          </p>
          <p>
            We do not guarantee that the Service will be uninterrupted, error-free, or completely
            secure. We are not responsible for data loss due to technical failures.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, Elitepro Team shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages, including
            but not limited to loss of profits, data, goodwill, or physical injury arising from
            your use of the Service.
          </p>
          <p>
            Our total liability to you for any claim arising from or relating to these Terms or
            the Service shall not exceed the amount you paid us in the twelve (12) months
            preceding the claim (or USD $50 if no payment was made).
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with applicable
            international law. Any disputes will first be attempted to be resolved amicably
            by contacting us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>13. Changes to These Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Material changes will be
            communicated via in-app notification at least 14 days before taking effect.
            Continued use of the Service after the effective date constitutes acceptance of
            the revised Terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>14. Contact</h2>
          <p>
            Questions about these Terms:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </section>

        <div className="legal-footer">
          <Link to="/privacy">Privacy Policy</Link>
          <span>·</span>
          <Link to="/">Back to ElitePro</Link>
        </div>
      </div>
    </div>
  );
}

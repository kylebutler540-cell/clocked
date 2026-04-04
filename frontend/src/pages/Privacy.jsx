import React from 'react';

const CONTACT_EMAIL = 'clockedsupport@gmail.com';
const LAST_UPDATED = 'April 4, 2025';

function Section({ number, title, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
        {number}. {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }) {
  return <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 8 }}>{children}</p>;
}

function UL({ items }) {
  return (
    <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 4 }}>{item}</li>
      ))}
    </ul>
  );
}

export default function Privacy() {
  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 20px 48px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>Last Updated: {LAST_UPDATED}</p>

      <Section number={1} title="Information We Collect">
        <P>We may collect:</P>
        <UL items={[
          'Email (if you sign up)',
          'Username / profile info',
          'Device information (IP, device type)',
          'Usage activity (likes, comments, posts)',
        ]} />
      </Section>

      <Section number={2} title="How We Use Your Information">
        <P>We use your data to:</P>
        <UL items={[
          'Run and improve the app',
          'Prevent abuse and spam',
          'Personalize your experience',
          'Communicate updates',
        ]} />
      </Section>

      <Section number={3} title="Anonymous Posting">
        <P>Even though posts are anonymous:</P>
        <UL items={[
          'We may still associate activity with your account internally.',
          'We do not publicly display personal identity (unless required by law).',
        ]} />
      </Section>

      <Section number={4} title="Data Sharing">
        <P>We do <strong>NOT</strong> sell personal data.</P>
        <P>We may share data:</P>
        <UL items={[
          'With service providers (hosting, analytics)',
          'If required by law',
          'To protect users or the platform',
        ]} />
      </Section>

      <Section number={5} title="Data Retention">
        <P>We keep data as long as necessary to:</P>
        <UL items={[
          'Operate the app',
          'Comply with legal obligations',
          'Prevent abuse',
        ]} />
      </Section>

      <Section number={6} title="Your Rights">
        <P>You may:</P>
        <UL items={[
          'Request account deletion',
          'Request your data',
          'Update your information',
        ]} />
      </Section>

      <Section number={7} title="Security">
        <P>We take reasonable steps to protect your data, but no system is 100% secure.</P>
      </Section>

      <Section number={8} title="Cookies / Tracking">
        <P>We may use cookies or similar technology to:</P>
        <UL items={[
          'Improve performance',
          'Track usage',
          'Enhance experience',
        ]} />
      </Section>

      <Section number={9} title="Age Requirement">
        <P>You must be at least 13 years old (or the applicable legal age in your region) to use Clocked.</P>
      </Section>

      <Section number={10} title="Changes to Privacy Policy">
        <P>We may update this policy at any time. Continued use of the app constitutes acceptance of the updated policy.</P>
      </Section>

      <Section number={11} title="Contact">
        <P>For privacy questions: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--purple)' }}>{CONTACT_EMAIL}</a></P>
      </Section>
    </div>
  );
}

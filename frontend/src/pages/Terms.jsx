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

export default function Terms() {
  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 20px 48px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Terms of Service</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>Last Updated: {LAST_UPDATED}</p>

      <Section number={1} title="Overview">
        <P>Clocked is a platform for anonymous workplace reviews from real workers and customers. By creating an account or using the app, you agree to follow these Terms.</P>
        <P>These Terms are a legally binding agreement between you and Clocked.</P>
      </Section>

      <Section number={2} title="User Content (Reviews, Comments, Posts)">
        <P>You are responsible for anything you post.</P>
        <UL items={[
          'You own your content, but you give Clocked permission to display, share, and promote it within the app.',
          'We may remove or moderate any content at any time.',
          'We are not responsible for what other users post.',
        ]} />
      </Section>

      <Section number={3} title="Community Guidelines">
        <P>You agree NOT to post:</P>
        <UL items={[
          'Nudity or sexual content',
          'Hate speech, threats, or harassment',
          'False or misleading information',
          'Personal attacks or doxxing (sharing private info)',
          'Illegal content',
          'Spam or fake reviews',
          'Excessive profanity or abusive language',
        ]} />
      </Section>

      <Section number={4} title="Moderation & Enforcement">
        <P>We can take action if you break the rules:</P>
        <UL items={[
          'Remove content',
          'Issue warnings',
          'Suspend or ban accounts',
        ]} />
        <P>We are not required to notify you before taking action.</P>
      </Section>

      <Section number={5} title="Anonymous Use">
        <P>Clocked allows anonymous posting, but:</P>
        <UL items={[
          'You are still responsible for your actions.',
          'We may retain account or device information for safety and legal compliance.',
        ]} />
      </Section>

      <Section number={6} title="No Guarantees / Accuracy">
        <P>Content on Clocked is user-generated.</P>
        <UL items={[
          'We do not guarantee accuracy of reviews or posts.',
          'Use information at your own risk.',
        ]} />
      </Section>

      <Section number={7} title="Limitation of Liability">
        <P>Clocked is not liable for:</P>
        <UL items={[
          'User-generated content',
          'Damages from using the app',
          'Business or employment decisions made based on content',
        ]} />
      </Section>

      <Section number={8} title="Intellectual Property">
        <UL items={[
          "You cannot copy or reuse Clocked's branding, design, or content.",
          "Users cannot post content they don't have rights to.",
        ]} />
      </Section>

      <Section number={9} title="Changes to Terms">
        <P>We can update these Terms at any time. Continued use of the app constitutes acceptance of the updated Terms.</P>
      </Section>

      <Section number={10} title="Contact">
        <P>For questions or reports: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--purple)' }}>{CONTACT_EMAIL}</a></P>
      </Section>
    </div>
  );
}

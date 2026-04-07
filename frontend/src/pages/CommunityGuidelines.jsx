import React from 'react';

const CONTACT_EMAIL = 'clockedsupport@gmail.com';

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

export default function CommunityGuidelines() {
  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 20px 48px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Community Guidelines</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>Last Updated: April 4, 2025</p>

      <Section number={1} title="Be Honest">
        <P>Clocked exists so workers and customers can share real experiences. Only post reviews based on genuine first-hand experience.</P>
        <UL items={[
          'No fake reviews or manufactured opinions',
          'No review bombing or coordinated attacks',
          'No posting on behalf of others without their consent',
        ]} />
      </Section>

      <Section number={2} title="Be Respectful">
        <P>Criticism of a workplace is fine. Personal attacks are not.</P>
        <UL items={[
          'No hate speech, slurs, or discrimination based on race, gender, religion, sexual orientation, disability, or any other identity',
          'No harassment, threats, or targeted abuse',
          'No doxxing — never share private personal information',
        ]} />
      </Section>

      <Section number={3} title="Keep It Legal">
        <UL items={[
          'No illegal content of any kind',
          'No content that violates NDAs, trade secrets, or confidentiality agreements',
          'No defamatory statements presented as fact',
          'No nudity or sexually explicit content',
        ]} />
      </Section>

      <Section number={4} title="No Spam or Manipulation">
        <UL items={[
          'No spam, repetitive posts, or low-effort content',
          'No using bots or fake accounts',
          'No promoting unrelated products or services',
        ]} />
      </Section>

      <Section number={5} title="Protect Anonymity">
        <P>Clocked is built on anonymous sharing. Respect that for everyone.</P>
        <UL items={[
          "Don't try to unmask or identify anonymous reviewers",
          "Don't post content that could expose others without their consent",
        ]} />
      </Section>

      <Section number={6} title="Enforcement">
        <P>We take these guidelines seriously. Violations may result in:</P>
        <UL items={[
          'Content removal',
          'Account warnings',
          'Temporary or permanent suspension',
        ]} />
        <P>We reserve the right to act without prior notice.</P>
      </Section>

      <Section number={7} title="Reporting">
        <P>See something that violates these guidelines? Report it in-app or email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--purple)', textDecoration: 'none' }}>{CONTACT_EMAIL}</a>.
        </P>
      </Section>
    </div>
  );
}

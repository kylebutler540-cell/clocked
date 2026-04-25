import React from 'react';
import { useNavigate } from 'react-router-dom';

const CONTACT_EMAIL = 'clockedsupport@gmail.com';
const LAST_UPDATED = 'April 22, 2026';

function Section({ number, title, children }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
        {number}. {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }) {
  return <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 10 }}>{children}</p>;
}

function UL({ items }) {
  return (
    <ul style={{ paddingLeft: 20, margin: '8px 0 10px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 5 }}>{item}</li>
      ))}
    </ul>
  );
}

export default function CommunityGuidelines() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 20px 64px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Community Guidelines</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Last Updated: {LAST_UPDATED}</p>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 32 }}>
        Clocked exists so workers can share honest, anonymous experiences about the places they work.
        These guidelines exist to protect that mission — and to protect every person on the platform,
        including reviewers, employers, and the individuals mentioned in reviews.
        For the full legal agreement, see our{' '}
        <button onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--purple)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Terms of Service</button>.
      </p>

      <Section number={1} title="Post Real, Honest Experiences">
        <P>The value of Clocked depends entirely on reviews being genuine. Every review you post must be based on your own firsthand experience.</P>
        <UL items={[
          'Only write reviews about workplaces you have personally worked at or experienced',
          'Do not post reviews on behalf of someone else, or reviews you were paid or incentivized to write',
          'Do not post reviews for workplaces you have never worked at — including review-bombing campaigns',
          'Fake, exaggerated, or manufactured reviews undermine the entire platform and may expose you to legal liability',
        ]} />
        <P>When you post a review, you confirm that it is based on your real experience. Clocked takes this seriously.</P>
      </Section>

      <Section number={2} title="Be Truthful — No Defamation">
        <P>
          You are free to be critical. Honest negative reviews are exactly what Clocked is for.
          But there is a clear line between honest criticism and harmful falsehoods.
        </P>
        <UL items={[
          'You may share your genuine opinions, experiences, and observations — even if they are negative',
          'You may not state things as facts that you know to be false, or that you have no factual basis to believe are true',
          'You may not post defamatory content — false statements that damage a person\'s or business\'s reputation',
          'If you are sharing an opinion, make it clear it is your opinion ("In my experience..." or "I felt that...")',
          'Do not make accusations of criminal conduct, fraud, or illegal activity without firsthand factual knowledge',
        ]} />
        <P>
          The difference: "The management at this location was disorganized and made scheduling errors constantly" is a valid experience.
          "The manager is stealing from the company" is a serious factual allegation that you should only make if you have direct knowledge of it.
        </P>
      </Section>

      <Section number={3} title="Naming Individuals">
        <P>
          Reviews sometimes need to reference specific people — managers, supervisors, coworkers. This is allowed within limits.
        </P>
        <UL items={[
          'You may reference employees or managers in their professional capacity — meaning their conduct, decisions, or behavior at work',
          'Stick to describing what happened in a professional context, not personal details about their life outside work',
          'Do not share personal information about any individual: home address, personal phone number, personal social media, vehicle details, family members, or anything that could be used to identify or locate them outside of work',
          'Do not make unverified allegations of criminal behavior against named individuals',
          'Ask yourself: is this about the workplace experience, or is this a personal attack? Reviews should be about the former.',
        ]} />
      </Section>

      <Section number={4} title="No Harassment, Threats, or Targeted Attacks">
        <P>Clocked is not a tool for targeting individuals. Any content whose primary purpose is to harm, intimidate, or harass a specific person is not allowed.</P>
        <UL items={[
          'No threats of any kind — physical, legal, financial, or otherwise',
          'No harassment campaigns or coordinated targeting of an individual',
          'No content designed to humiliate, shame, or degrade a specific person',
          'No repeated negative posting about the same individual across multiple reviews',
        ]} />
      </Section>

      <Section number={5} title="No Hate Speech or Discrimination">
        <UL items={[
          'No content that attacks, demeans, or calls for discrimination against any person or group based on race, ethnicity, nationality, religion, gender, sexual orientation, disability, age, or any other protected characteristic',
          'You may report discriminatory workplace practices you personally witnessed — but describe the experience, not attack groups of people',
        ]} />
      </Section>

      <Section number={6} title="Protect Everyone's Privacy — No Doxxing">
        <P>
          Clocked protects the anonymity of its reviewers. We ask you to extend that same respect to others.
        </P>
        <UL items={[
          'Never share private personal information about any identifiable person — reviewers, managers, coworkers, or anyone else',
          'Do not try to identify or expose anonymous reviewers',
          'Do not post content that includes home addresses, personal contact information, financial records, or other private details',
          'This applies even if the information is technically publicly available — the intent matters',
        ]} />
      </Section>

      <Section number={7} title="No Explicit, Illegal, or Harmful Content">
        <UL items={[
          'No nudity or sexually explicit content',
          'No content that promotes, glorifies, or instructs others to commit illegal acts',
          'No content that violates NDAs, trade secrets, or valid confidentiality agreements you are bound by',
          'No spam, repetitive posts, or low-effort content designed to clutter the platform',
          'No bot accounts, fake accounts, or coordinated inauthentic activity of any kind',
        ]} />
      </Section>

      <Section number={8} title="Content Moderation & Enforcement">
        <P>We take these guidelines seriously. Violations may result in:</P>
        <UL items={[
          'Immediate removal of the violating content',
          'A warning to your account',
          'Temporary or permanent suspension',
          'Reporting to law enforcement where required by law',
        ]} />
        <P>
          We reserve the right to remove content or take action on accounts at our discretion, without advance notice.
          Moderation decisions are made in good faith but are final.
        </P>
        <P>
          Clocked does not remove reviews simply because a business or employer is unhappy with them.
          We remove content that violates these guidelines — not content that is merely negative or critical.
        </P>
      </Section>

      <Section number={9} title="Reporting Violations">
        <P>
          If you see content that violates these guidelines, please report it using the flag button on any post.
          Select the most accurate reason — common categories include:
        </P>
        <UL items={[
          'Defamatory or False Information — content you believe contains false statements of fact',
          'Spam or Fake Review — clearly manufactured or fake content',
          'Harassment or Threats — targeted threatening or harassing content',
          'Hate Speech — content attacking protected groups',
          'Personal Information Exposed (Doxxing) — private info shared without consent',
          'Unverified Criminal Allegations — serious unsubstantiated accusations',
        ]} />
        <P>
          Businesses or individuals who believe a review about them is false or defamatory may also contact us directly at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--purple)', textDecoration: 'none' }}>{CONTACT_EMAIL}</a>.
          Please include a link to the specific content, an explanation of what you believe is false, and your contact information.
          We review all credible reports. We do not remove reviews simply because they are negative.
        </P>
      </Section>

      <Section number={10} title="Your Responsibility">
        <P>
          When you post on Clocked, you are responsible for what you write. Anonymity protects your identity on the platform
          — but it does not eliminate your legal responsibility for your content.
        </P>
        <P>
          If your content causes legal harm — a defamation lawsuit, for example — you agreed in our{' '}
          <button onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--purple)', cursor: 'pointer', fontSize: 14 }}>Terms of Service</button>
          {' '}to indemnify Clocked against those costs. Post honestly. Post fairly. It protects everyone — including you.
        </P>
      </Section>
    </div>
  );
}

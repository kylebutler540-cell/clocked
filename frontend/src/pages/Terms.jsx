import React from 'react';

const CONTACT_EMAIL = 'clockedsupport@gmail.com';
const LAST_UPDATED = 'April 24, 2026';
const APP_NAME = 'Clocked';

function Section({ id, number, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        {number}. {title}
      </h2>
      {children}
    </section>
  );
}

function Sub({ number, title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {title && (
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          {number} {title}
        </p>
      )}
      {!title && (
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{number}</p>
      )}
      {children}
    </div>
  );
}

function P({ children }) {
  return <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 10 }}>{children}</p>;
}

function UL({ items }) {
  return (
    <ul style={{ paddingLeft: 22, margin: '8px 0 10px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 6 }}>{item}</li>
      ))}
    </ul>
  );
}

function Caps({ children }) {
  return <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 10, fontWeight: 600, letterSpacing: 0.1 }}>{children}</p>;
}

export default function Terms() {
  return (
    <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', padding: '32px 28px 80px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Terms of Service</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Last Updated: {LAST_UPDATED}</p>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 40 }}>
        These Terms of Service ("Terms") govern your access to and use of the {APP_NAME} platform, including our website,
        mobile application, and any related services (collectively, the "Service"), provided by {APP_NAME} ("we," "us," or "our").
        By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
      </p>

      {/* ─── 1. General Terms ─── */}
      <Section number={1} title="General Terms">
        <Sub number="1.1">
          <P>
            You are responsible for your use of the Service and for any content you post, submit, or transmit through it.
            Content you submit may be viewed by other users who have access to the same Service. You should only submit
            content that you are comfortable sharing with others under these Terms.
          </P>
        </Sub>

        <Sub number="1.2">
          <P>
            You must be at least 16 years of age to use the Service. By creating an account or using the Service, you
            represent and warrant that: (1) you are at least 16 years old; (2) you have the legal capacity to enter into
            a binding agreement; and (3) you are not prohibited from receiving the Service under any applicable law.
          </P>
        </Sub>

        <Sub number="1.3">
          <P>
            The Service is always evolving. {APP_NAME} may change, suspend, or discontinue any feature or aspect of the
            Service at any time without prior notice. We may also add or create new limits on use and storage at our sole
            discretion. We reserve the right to restrict access to the Service or terminate accounts without prior notice
            in cases of violation of these Terms.
          </P>
        </Sub>

        <Sub number="1.4">
          <P>
            {APP_NAME} grants you a personal, non-commercial, non-exclusive, non-transferable, revocable license to access
            and use the Service for its intended purpose, subject to these Terms. You may not sublicense, sell, resell,
            transfer, assign, or otherwise exploit the Service for any commercial purpose not expressly permitted by us.
          </P>
        </Sub>

        <Sub number="1.5">
          <P>
            These Terms, together with our Community Guidelines and any other policies incorporated by reference, constitute
            the entire agreement between you and {APP_NAME} regarding your use of the Service and supersede all prior
            agreements. You are responsible for reviewing these Terms and any updates to them regularly.
          </P>
        </Sub>
      </Section>

      {/* ─── 2. Accounts ─── */}
      <Section number={2} title="Accounts">
        <Sub number="2.1">
          <P>
            You must create an account to access most features of the Service. When creating an account, you agree to
            provide accurate, current, and complete information. You are responsible for maintaining the accuracy of your
            account information.
          </P>
        </Sub>

        <Sub number="2.2">
          <P>
            You are solely responsible for maintaining the confidentiality of your account credentials and for all activity
            that occurs under your account. You agree to notify us immediately at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--purple)' }}>{CONTACT_EMAIL}</a> if you suspect
            any unauthorized access to your account. {APP_NAME} is not liable for any loss or damage resulting from your
            failure to protect your account credentials.
          </P>
        </Sub>

        <Sub number="2.3">
          <P>
            You may not create multiple accounts, create accounts under false or fraudulent pretenses, or create or use
            an account for anyone other than yourself. Accounts may not be traded, sold, or transferred to another person,
            whether for payment or for free.
          </P>
        </Sub>

        <Sub number="2.4">
          <P>
            All information you provide to {APP_NAME} is subject to our Privacy Policy. By using the Service, you
            acknowledge and agree to {APP_NAME}'s collection and use of your information as described in our Privacy Policy,
            including the potential for storing and processing your data.
          </P>
        </Sub>

        <Sub number="2.5">
          <P>
            As part of providing the Service, {APP_NAME} may send you service-related announcements, account notices,
            and platform updates. These communications are part of the Service and you may not opt out of receiving them
            while maintaining an active account.
          </P>
        </Sub>
      </Section>

      {/* ─── 3. User Content ─── */}
      <Section number={3} title="User Content">
        <Sub number="3.1" title="Ownership and License">
          <P>
            You retain all rights and ownership in the content you post ("Your Content"). However, by submitting Your
            Content to the Service, you grant {APP_NAME} a worldwide, unrestricted, irrevocable, perpetual, non-exclusive,
            fully-paid, and royalty-free license to use, reproduce, copy, modify, publish, translate, transmit, display,
            distribute, adapt, and create derivative works of Your Content in any media now known or later developed,
            for any purpose related to operating, improving, and promoting the Service. No compensation will be paid
            to you for Your Content.
          </P>
        </Sub>

        <Sub number="3.2" title="Content Standards">
          <P>
            You are solely responsible for Your Content. By submitting content, you represent and warrant that:
          </P>
          <UL items={[
            'You own or have the right to submit Your Content under these Terms.',
            'Your Content does not violate any applicable law or third-party rights.',
            'Your Content is based on your own firsthand, personal experience and is not fabricated, secondhand, or unverifiable.',
            'Your Content does not infringe on any copyright, trademark, trade secret, or other intellectual property right of any third party.',
            'Your Content does not violate any confidentiality or non-disclosure obligations you may have to any employer or other party.',
          ]} />
        </Sub>

        <Sub number="3.3" title="Disclaimer of Endorsement">
          <P>
            {APP_NAME} does not endorse, support, verify, or guarantee the accuracy, truthfulness, or reliability of any
            content posted by users. You acknowledge that by using the Service you may be exposed to content that is
            offensive, inaccurate, or otherwise inappropriate. Under no circumstances will {APP_NAME} be liable for any
            content, including any errors, omissions, or inaccuracies in any content, or any loss or damage resulting
            from the use of content posted through the Service.
          </P>
        </Sub>

        <Sub number="3.4" title="Content Moderation">
          <P>
            We reserve the right — but not the obligation — to monitor, review, edit, hide, or remove any content at
            any time, at our sole discretion, including content that violates these Terms, our Community Guidelines,
            or that we otherwise determine is not in keeping with the purpose of the platform. We are not obligated
            to monitor content nor are we responsible for the monitoring.
          </P>
        </Sub>
      </Section>

      {/* ─── 4. Truthfulness & Defamation ─── */}
      <Section number={4} title="Truthfulness & Defamation">
        <Sub number="4.1">
          <P>
            {APP_NAME} is built on honest, authentic workplace reviews. The integrity of the platform depends on users
            posting truthful content. You agree that all content you submit will meet the following standards:
          </P>
          <UL items={[
            'Your content must be truthful and based on your real, personal experience.',
            'You may not post false statements of fact — statements you know to be untrue, or statements made with reckless disregard for their truth.',
            'You may not post defamatory content — false statements that damage the reputation of an identifiable person, employer, or business.',
            'Opinions are permitted, but must be clearly presented as personal opinions, not objective facts.',
            'Fake reviews, incentivized reviews, or reviews written on behalf of someone else are strictly prohibited.',
            'You may not submit Content that does not reflect your honest opinion and authentic experience.',
          ]} />
        </Sub>

        <Sub number="4.2">
          <P>
            Violating this section may result in immediate content removal, account suspension, and may expose you to
            civil or criminal liability. {APP_NAME} cooperates with valid legal processes involving defamation claims
            and may disclose account information as required by law.
          </P>
        </Sub>
      </Section>

      {/* ─── 5. Prohibited Content & Actions ─── */}
      <Section number={5} title="Prohibited Content & Actions">
        <Sub number="5.1">
          <P>Users who engage in the following actions may be temporarily or permanently restricted from using the Service:</P>
          <UL items={[
            'Posting false, defamatory, misleading, or fraudulent content.',
            'Posting content that constitutes harassment, intimidation, or threats toward any person.',
            'Posting hate speech — content that attacks a person or group based on protected characteristics such as race, ethnicity, gender, religion, sexual orientation, national origin, or disability.',
            'Disclosing private personal information about any individual (doxxing) — including home addresses, personal phone numbers, financial information, or any information that could be used to identify or harm a private person.',
            'Making unverified allegations of criminal conduct against any identifiable person or business.',
            'Posting sexual or explicit content.',
            'Promoting or facilitating illegal activity.',
            'Submitting spam, unsolicited advertising, or engaging in coordinated inauthentic behavior.',
            'Creating accounts under false or fraudulent pretenses, or creating multiple accounts to submit content or manipulate the platform.',
            'Trading, selling, or transferring accounts, whether for payment or for free.',
            'Scraping, crawling, data mining, or otherwise extracting data from the Service without our express written permission, whether through automated or manual means.',
            'Reverse engineering, decompiling, disassembling, or otherwise attempting to derive source code from the Service.',
            'Using bots, automated tools, or other technical means to manipulate, game, or interfere with the Service.',
            'Introducing viruses, trojans, worms, or other malicious software to the Service or its infrastructure.',
            'Interfering with or disrupting the operation of the Service, its servers, or networks.',
            'Copying or using content from the Service in connection with a competing service without our express written permission.',
            'Impersonating another person or misrepresenting your affiliation with any employer or organization.',
            'Accessing the Service by any means not expressly authorized by these Terms.',
            'Attempting, aiding, or inciting any of the actions listed above.',
          ]} />
        </Sub>

        <Sub number="5.2">
          <P>
            Violations of these prohibitions may result in content removal, account suspension, permanent bans, and/or
            referral to law enforcement or regulatory authorities.
          </P>
        </Sub>
      </Section>

      {/* ─── 6. Naming Individuals ─── */}
      <Section number={6} title="Naming Individuals">
        <Sub number="6.1">
          <P>
            Workplace reviews sometimes reference coworkers, supervisors, or managers. This is permitted within the
            following limits:
          </P>
          <UL items={[
            'You may reference employees, supervisors, or managers in a professional context — meaning in relation to their conduct, decisions, or behavior in their professional role.',
            'You may not share personal identifying information about any individual, including home addresses, personal contact information, vehicle information, or details about their private life.',
            'You may not make allegations of criminal conduct, illegal activity, or serious personal wrongdoing without a factual, firsthand basis for that claim.',
            'You may not post content whose primary purpose is to target, embarrass, or harm a specific individual rather than to share a genuine workplace experience.',
            'Public figures and business owners acting in their professional capacity have reduced privacy expectations regarding their professional conduct but still retain protections for their private lives.',
          ]} />
        </Sub>

        <Sub number="6.2">
          <P>
            When in doubt, focus on the experience — not the person. Reviews that describe workplace conditions, culture,
            management practices, and work environment are appropriate. Content that reads as a personal attack on a
            named individual may be removed at our discretion.
          </P>
        </Sub>
      </Section>

      {/* ─── 7. Anonymous Use ─── */}
      <Section number={7} title="Anonymous Use">
        <Sub number="7.1">
          <P>
            {APP_NAME} permits anonymous posting to protect users' ability to share honest workplace experiences without
            fear of retaliation. However, anonymity does not eliminate legal responsibility.
          </P>
        </Sub>

        <Sub number="7.2">
          <P>You acknowledge and agree that:</P>
          <UL items={[
            'You remain legally responsible for the content you post, regardless of whether your identity is publicly visible.',
            'Clocked may retain account metadata, device information, and IP logs for safety and legal compliance purposes.',
            'We may disclose identifying information in response to valid legal process, such as a court order or subpoena.',
            'Anonymity is a feature of the platform, not a guarantee of absolute privacy or immunity from legal consequences.',
            'Depending on the specifics of your content (e.g., job title, location, employer), it may be possible for others to narrow down your identity even with anonymity enabled. You assume this risk when posting.',
          ]} />
        </Sub>
      </Section>

      {/* ─── 8. Takedown & Complaint Process ─── */}
      <Section number={8} title="Takedown & Complaint Process">
        <Sub number="8.1">
          <P>
            If you are an individual or business that believes content on {APP_NAME} is false, defamatory, or otherwise
            in violation of these Terms, you may submit a complaint to us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--purple)' }}>{CONTACT_EMAIL}</a>.
          </P>
        </Sub>

        <Sub number="8.2">
          <P>Your complaint should include:</P>
          <UL items={[
            'A link to or description of the specific content you are reporting.',
            'A clear explanation of why you believe the content violates our Terms or applicable law.',
            'Your name and contact information.',
            'If asserting defamation: a specific statement about which claims you believe are false and why.',
          ]} />
        </Sub>

        <Sub number="8.3">
          <P>
            We review complaints in good faith and will respond to credible reports. We are not obligated to remove
            content solely because it is unflattering, negative, or critical. We will remove content that clearly
            violates our Terms or that we are legally required to remove. Content moderation decisions are made at
            our sole discretion and are final.
          </P>
        </Sub>

        <Sub number="8.4" title="Copyright Policy">
          <P>
            {APP_NAME} respects the intellectual property rights of others and expects users to do the same. If you
            believe your copyrighted work has been posted on the Service without authorization, please send a notice
            to <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--purple)' }}>{CONTACT_EMAIL}</a> that includes:
          </P>
          <UL items={[
            'A physical or electronic signature of the copyright owner or authorized agent.',
            'Identification of the copyrighted work claimed to have been infringed.',
            'Identification of the infringing material and sufficient information to locate it on the Service.',
            'Your contact information (address, phone number, and email).',
            'A statement that you have a good faith belief that the use is not authorized by the copyright owner, its agent, or the law.',
            'A statement, under penalty of perjury, that the information in your notice is accurate and that you are authorized to act on behalf of the copyright owner.',
          ]} />
          <P>
            We reserve the right to remove content alleged to be infringing without prior notice and without liability.
            We may terminate accounts of users who are repeat infringers.
          </P>
        </Sub>
      </Section>

      {/* ─── 9. Clocked's Rights ─── */}
      <Section number={9} title="Clocked's Rights">
        <Sub number="9.1">
          <P>
            All rights, title, and interest in and to the Service — excluding user-generated content — are and will
            remain the exclusive property of {APP_NAME} and its licensors. The Service is protected by copyright,
            trademark, and other applicable laws.
          </P>
        </Sub>

        <Sub number="9.2">
          <P>
            Nothing in these Terms grants you the right to use {APP_NAME}'s name, trademarks, logos, domain names, or
            other distinctive brand features without our prior written consent.
          </P>
        </Sub>

        <Sub number="9.3">
          <P>
            Any feedback, suggestions, or ideas you provide about the Service are entirely voluntary and may be used by
            {APP_NAME} without any obligation or compensation to you.
          </P>
        </Sub>

        <Sub number="9.4">
          <P>
            We reserve the right, at our sole discretion, to: suspend or terminate any user account; remove or restrict
            any content; modify or discontinue any feature; and take any action we believe is necessary to protect the
            safety, integrity, or legal standing of the platform.
          </P>
        </Sub>
      </Section>

      {/* ─── 10. Disclaimer of Warranties ─── */}
      <Section number={10} title="Disclaimer of Warranties">
        <Sub number="10.1">
          <P>
            By accessing or using the Service, you acknowledge and agree that you may be exposed to content from others
            that may be offensive, inaccurate, indecent, or objectionable. Opinions expressed on the Service do not
            reflect our views. We do not endorse any content posted by users or third parties.
          </P>
        </Sub>

        <Sub number="10.2">
          <Caps>
            WE ARE NOT LIABLE FOR ANY ACTIONS, OMISSIONS, OR BEHAVIORS OF USERS OR THIRD PARTIES IN RELATION TO THE
            SERVICE. WE HAVE NO OBLIGATION TO INTERVENE IN DISPUTES BETWEEN USERS ARISING THROUGH THE SERVICE.
          </Caps>
        </Sub>

        <Sub number="10.3">
          <Caps>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS PROVIDED TO YOU "AS IS" AND "AS AVAILABLE,"
            WITHOUT WARRANTY OF ANY KIND, EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. WE MAKE NO WARRANTY THAT (A) THE
            SERVICE WILL MEET YOUR REQUIREMENTS OR WILL BE CONSTANTLY AVAILABLE, UNINTERRUPTED, TIMELY, SECURE, OR
            ERROR-FREE; (B) THE RESULTS OBTAINED FROM THE USE OF THE SERVICE WILL BE EFFECTIVE, ACCURATE, OR RELIABLE;
            OR (C) ANY ERRORS OR DEFECTS IN THE SERVICE WILL BE CORRECTED.
          </Caps>
        </Sub>
      </Section>

      {/* ─── 11. Limitation of Liability ─── */}
      <Section number={11} title="Limitation of Liability">
        <Sub number="11.1">
          <Caps>
            TO THE FULLEST EXTENT PERMITTED BY LAW, {APP_NAME.toUpperCase()} AND ITS OWNERS, OFFICERS, EMPLOYEES, AND
            AGENTS SHALL NOT BE LIABLE TO YOU OR ANYONE ELSE FOR ANY SPECIAL, INCIDENTAL, INDIRECT, CONSEQUENTIAL, OR
            PUNITIVE DAMAGES, ANY LOSS OF PROFITS, REVENUE, DATA, USE, GOODWILL, REPUTATION, OR OTHER INTANGIBLE LOSSES,
            WHETHER INCURRED DIRECTLY OR INDIRECTLY, ARISING FROM: (A) ANY USER-GENERATED CONTENT; (B) YOUR USE OF OR
            INABILITY TO USE THE SERVICE; (C) EMPLOYMENT OR BUSINESS DECISIONS MADE BASED ON CONTENT ON THE PLATFORM;
            (D) LOSS OF PROFITS, DATA, OR REPUTATION; OR (E) ANY CONDUCT OF THIRD PARTIES ON OR OFF THE PLATFORM.
          </Caps>
        </Sub>

        <Sub number="11.2">
          <P>
            In any case, our total liability to you for any claims arising from use of the Service shall not exceed the
            greater of $100 USD or the total amount you paid to us in the 12 months preceding the claim.
          </P>
        </Sub>

        <Sub number="11.3">
          <P>
            The limitations and exclusions in this section apply to the maximum extent permitted by applicable law.
            Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability, so some
            of the above limitations may not apply to you.
          </P>
        </Sub>
      </Section>

      {/* ─── 12. Indemnification ─── */}
      <Section number={12} title="Indemnification">
        <Sub number="12.1">
          <P>
            You agree to indemnify, defend, and hold harmless {APP_NAME} and its owners, officers, employees, and agents
            (collectively, "the {APP_NAME} Group") from and against any and all claims, damages, losses, liabilities,
            costs, and expenses (including reasonable attorneys' fees) arising out of or in connection with:
          </P>
          <UL items={[
            'Any content you post, submit, or transmit through the Service.',
            'Your use of the Service in violation of these Terms.',
            'Your violation of any applicable law, regulation, or third-party right.',
            'Any claim that your content caused damage to a third party.',
            'Any breach of any representation or warranty you have made in these Terms.',
          ]} />
        </Sub>

        <Sub number="12.2">
          <P>
            This means that if your content causes legal trouble — including defamation claims, cease-and-desist actions,
            or regulatory proceedings — you are responsible for those costs, not {APP_NAME}. We reserve the right to
            assume exclusive control of the defense of any claim for which indemnification is owed, at your expense.
            You agree to cooperate with our defense of such claims.
          </P>
        </Sub>
      </Section>

      {/* ─── 13. Termination ─── */}
      <Section number={13} title="Termination">
        <Sub number="13.1">
          <P>You may discontinue using the Service and delete your account at any time.</P>
        </Sub>

        <Sub number="13.2">
          <P>
            We may suspend or terminate your account, or restrict your access to any part of the Service, at any time
            and for any reason — or no reason — without prior notice, including for violations of these Terms. We will
            have no liability whatsoever to you for any such termination or related deletion of your data.
          </P>
        </Sub>

        <Sub number="13.3">
          <P>
            Repeated violations of our Terms or Community Guidelines will result in a temporary suspension from submitting
            content; further violations will result in a permanent account ban. Serious violations — including submitting
            defamatory content, coordinated inauthentic behavior, or using the Service for illegal purposes — may result
            in immediate permanent suspension without prior warning.
          </P>
        </Sub>

        <Sub number="13.4">
          <P>
            All provisions of these Terms that by their nature should survive termination shall survive, including but
            not limited to: your content license grant to {APP_NAME}, indemnification obligations, warranty disclaimers,
            and limitations of liability.
          </P>
        </Sub>
      </Section>

      {/* ─── 14. Section 230 ─── */}
      <Section number={14} title="Platform Status & Section 230">
        <Sub number="14.1">
          <P>
            {APP_NAME} is a neutral, third-party platform that hosts content created by its users. We do not endorse,
            verify, adopt, or take responsibility for any review, comment, or post made by users.
          </P>
        </Sub>

        <Sub number="14.2">
          <P>
            In accordance with Section 230 of the U.S. Communications Decency Act, {APP_NAME} is an interactive computer
            service and shall not be treated as the publisher or speaker of any user-provided content. We cannot be held
            liable for claims arising from content provided by third parties on the Service.
          </P>
        </Sub>
      </Section>

      {/* ─── 15. Dispute Resolution ─── */}
      <Section number={15} title="Dispute Resolution">
        <Sub number="15.1" title="Informal Resolution">
          <P>
            Before filing any formal legal claim, you agree to first contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--purple)' }}>{CONTACT_EMAIL}</a> and provide
            written notice describing the nature of your dispute and the relief you seek. We agree to attempt to resolve
            the dispute informally within 30 days of receiving notice. If we cannot reach resolution within 30 days,
            either party may pursue formal proceedings.
          </P>
        </Sub>

        <Sub number="15.2" title="Governing Law">
          <P>
            These Terms are governed by and construed in accordance with the laws of the State of Michigan, without
            regard to its conflict of law provisions. Any disputes arising under these Terms that are not resolved
            informally shall be brought exclusively in the state or federal courts located in Michigan, and you consent
            to personal jurisdiction in those courts.
          </P>
        </Sub>

        <Sub number="15.3" title="No Class Actions">
          <P>
            Any claims or disputes must be brought in your individual capacity only, and not as a plaintiff or class
            member in any purported class action, collective proceeding, or representative action.
          </P>
        </Sub>
      </Section>

      {/* ─── 16. General ─── */}
      <Section number={16} title="General Provisions">
        <Sub number="16.1" title="Changes to Terms">
          <P>
            We may update these Terms at any time. When we make material changes, we will update the "Last Updated"
            date at the top of this page and may notify you through the Service or by email. Your continued use of
            the Service after any changes constitutes your acceptance of the updated Terms.
          </P>
        </Sub>

        <Sub number="16.2" title="Severability">
          <P>
            If any provision of these Terms is found to be invalid, illegal, or unenforceable, that provision shall
            be modified to the minimum extent necessary to make it enforceable, or severed if modification is not
            possible, and the remaining provisions shall continue in full force and effect.
          </P>
        </Sub>

        <Sub number="16.3" title="No Waiver">
          <P>
            Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right
            or provision. Any waiver of any provision of these Terms will be effective only if in writing.
          </P>
        </Sub>

        <Sub number="16.4" title="Assignment">
          <P>
            You may not assign or transfer your rights or obligations under these Terms to any third party without
            our prior written consent. {APP_NAME} may assign or transfer these Terms, in whole or in part, without
            restriction, including in connection with a merger, acquisition, or sale of assets.
          </P>
        </Sub>

        <Sub number="16.5" title="Entire Agreement">
          <P>
            These Terms, together with our Community Guidelines and Privacy Policy, constitute the entire agreement
            between you and {APP_NAME} regarding your use of the Service and supersede all prior and contemporaneous
            agreements, representations, and understandings.
          </P>
        </Sub>

        <Sub number="16.6" title="Language">
          <P>
            The English version of these Terms is the version used when interpreting or construing this agreement.
          </P>
        </Sub>
      </Section>

      {/* ─── 17. Contact ─── */}
      <Section number={17} title="Contact">
        <Sub number="17.1">
          <P>
            For questions about these Terms, content complaints, legal notices, or takedown requests, please contact us at:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--purple)', fontWeight: 600 }}>{CONTACT_EMAIL}</a>
          </P>
          <P>
            We aim to respond to all credible inquiries within a reasonable time. Legal notices and court orders should
            be directed to the same email address.
          </P>
        </Sub>
      </Section>
    </div>
  );
}

import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy | MCQ Property Care" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 19, 2026">
      <section><h2>1. Information we collect</h2><p>We collect information you provide, including your name, email, phone number, service address, home details, access instructions, task descriptions, photos, messages, appointments, and service history. We also collect limited account, security, and device information needed to operate and protect the portal.</p></section>
      <section><h2>2. How we use information</h2><ul><li>Schedule, perform, document, and support requested services.</li><li>Link homes and service history to the correct customer account.</li><li>Send transactional messages such as invitations, appointment updates, password resets, and service follow-ups.</li><li>Maintain security, prevent abuse, troubleshoot failures, and comply with legal obligations.</li><li>Improve MCQ operations and customer experience.</li></ul></section>
      <section><h2>3. Sensitive property information</h2><p>Gate codes, Wi-Fi credentials, and similar access details are used only to provide authorized service and are protected with access controls and encryption where supported. Please avoid storing information that MCQ does not need.</p></section>
      <section><h2>4. Sharing</h2><p>We do not sell personal information. We share information only with service providers needed to run MCQ—such as hosting, database, email, mapping, and payment providers—or when required by law, needed to protect safety and rights, or directed by you.</p></section>
      <section><h2>5. Payments</h2><p>Payment providers process card or banking information under their own privacy practices. MCQ may receive transaction identifiers, status, amount, and limited billing details, but does not need to store complete payment-card numbers in this portal.</p></section>
      <section><h2>6. Retention</h2><p>We retain account, property, job, and communication records as reasonably necessary to provide service, maintain warranties and business records, resolve disputes, and meet legal obligations. Records may be deleted or anonymized when no longer required.</p></section>
      <section><h2>7. Your choices</h2><p>You may update profile and property information in the portal and can request access, correction, or deletion by contacting us. Some records may be retained when required for legitimate business or legal reasons. You may opt out of non-essential marketing, while necessary service and security messages may still be sent.</p></section>
      <section><h2>8. Security and children</h2><p>We use reasonable administrative, technical, and physical safeguards, but no online system can guarantee absolute security. The services are intended for adults arranging property services and are not directed to children under 13.</p></section>
      <section><h2>9. Changes and contact</h2><p>We may update this policy as the service changes and will post the revised date here. Questions or privacy requests may be sent to <a href="mailto:anthony@mcqpropertycare.com">anthony@mcqpropertycare.com</a> or <a href="tel:2144697795">(214) 469-7795</a>.</p></section>
    </LegalPage>
  );
}

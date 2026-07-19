import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service | MCQ Property Care" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 19, 2026">
      <section><h2>1. Agreement</h2><p>These Terms govern your use of the MCQ Property Care website, customer portal, scheduling tools, and home-maintenance services. By creating an account, booking a visit, or purchasing services, you agree to these Terms.</p></section>
      <section><h2>2. Services and estimates</h2><p>MCQ provides general home maintenance, repair, installation, and related coordination services in the Dallas–Fort Worth area. Estimates are based on the information available before work begins and may change when site conditions, requested scope, parts, permits, or specialist work differ from that information. Material changes will be discussed before additional work proceeds.</p></section>
      <section><h2>3. Scheduling and access</h2><p>You agree to provide accurate contact, property, access, and safety information and to ensure MCQ can safely enter and work at the property. Appointment times are arrival windows and may shift because of traffic, weather, emergency work, or prior-job conditions. We will communicate material delays.</p></section>
      <section><h2>4. Cancellations</h2><p>Please provide at least 24 hours’ notice when cancelling or rescheduling. Repeated late cancellations, inaccessible properties, or no-shows may result in a reasonable trip or cancellation charge disclosed before collection. MCQ may reschedule work when conditions are unsafe or the requested work requires a licensed specialist.</p></section>
      <section><h2>5. Membership visits</h2><p>Membership allowances, visit duration, term, and included benefits are those shown when the membership is activated. Visits are tied to the enrolled home, expire at the end of the applicable term unless MCQ agrees otherwise in writing, and do not include parts, permits, specialist trades, or work outside the agreed scope.</p></section>
      <section><h2>6. Payment</h2><p>Prices, approved estimates, parts, and applicable taxes are due according to the invoice or written agreement. Disputed charges should be reported promptly so we can review the work and records. Payment processing may be provided by a third party subject to its own terms.</p></section>
      <section><h2>7. Photos and property information</h2><p>You may upload photos and property details to explain requested work. You represent that you have permission to provide them. MCQ may use job photos internally to document condition and completed work. We will request separate permission before using identifiable property photos for public marketing.</p></section>
      <section><h2>8. Acceptable use</h2><ul><li>Do not misuse the portal, impersonate another person, or attempt unauthorized access.</li><li>Do not upload unlawful, malicious, or unrelated content.</li><li>Keep account credentials private and notify us of suspected unauthorized use.</li></ul></section>
      <section><h2>9. Workmanship and limitations</h2><p>MCQ will perform services with reasonable care and skill. Any workmanship remedy is limited to correcting the affected service within a reasonable period after notice. To the maximum extent permitted by law, MCQ is not responsible for concealed conditions, pre-existing defects, owner-supplied parts, manufacturer failures, or indirect or consequential losses.</p></section>
      <section><h2>10. Contact and governing law</h2><p>Texas law governs these Terms. Before filing a claim, both sides agree to make a good-faith effort to resolve the issue directly. Questions may be sent to <a href="mailto:anthony@mcqpropertycare.com">anthony@mcqpropertycare.com</a> or by calling <a href="tel:2144697795">(214) 469-7795</a>.</p></section>
    </LegalPage>
  );
}

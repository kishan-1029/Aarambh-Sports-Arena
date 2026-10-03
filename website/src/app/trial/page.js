import { Suspense } from 'react';
import TrialForm from '@/components/TrialForm';

export const metadata = {
  title: 'Book a trial',
  description: 'Book a free trial session at Arambh Sports Arena.',
};

export default function TrialPage() {
  return (
    <div className="container section-tight">
      <div className="page-hero">
        <h1 className="section-title">Book a trial</h1>
        <p className="section-lead">
          Prefer a slot from Availability, or send your details and we&apos;ll confirm a time.
        </p>
      </div>
      <Suspense fallback={<p className="muted">Loading form…</p>}>
        <TrialForm />
      </Suspense>
    </div>
  );
}

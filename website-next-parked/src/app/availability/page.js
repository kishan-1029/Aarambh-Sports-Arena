import { Suspense } from 'react';
import AvailabilityGrid from '@/components/AvailabilityGrid';

export const metadata = {
  title: 'Availability',
  description: 'See free court slots this week at Arambh Sports Arena.',
};

export default function AvailabilityPage() {
  return (
    <div className="container section-tight">
      <div className="page-hero">
        <h1 className="section-title">What&apos;s free</h1>
        <p className="section-lead">
          Free and busy slots only — we never show who booked. Tap a free slot to request a trial.
        </p>
      </div>
      <Suspense fallback={<p className="muted">Loading availability…</p>}>
        <AvailabilityGrid />
      </Suspense>
    </div>
  );
}

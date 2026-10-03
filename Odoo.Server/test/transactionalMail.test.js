import { describe, expect, test } from '@jest/globals';
import { fillTemplate, formatBookedSlots, formatRupees, formatTimeRange } from '../src/modules/mail/transactionalMail.js';

describe('transactional mail templates', () => {
  test('fills booking placeholders and leaves unknown tokens empty', () => {
    const html = fillTemplate('Hi {{name}}, booking {{bookingNo}} {{missing}}', {
      name: 'Asha',
      bookingNo: 'BK-2026-00012',
    });
    expect(html).toBe('Hi Asha, booking BK-2026-00012 ');
  });

  test('formats paise as rupees', () => {
    expect(formatRupees(150000)).toBe('₹1500');
  });

  test('lists each booked slot in India time', () => {
    const booking = {
      start: new Date('2026-10-04T03:30:00.000Z'),
      end: new Date('2026-10-04T04:30:00.000Z'),
      slotStarts: [
        new Date('2026-10-04T03:30:00.000Z'),
        new Date('2026-10-04T04:00:00.000Z'),
      ],
    };
    expect(formatTimeRange(booking.start, booking.end)).toBe('9:00 am – 10:00 am');
    expect(formatBookedSlots(booking)).toBe('9:00 am – 9:30 am<br>9:30 am – 10:00 am');
  });
});

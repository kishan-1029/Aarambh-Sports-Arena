import { config } from '../../../config/index.js';
import { mockProvider } from './mock.js';
import { razorpayProvider } from './razorpay.js';

const providers = {
  mock: mockProvider,
  razorpay: razorpayProvider,
};

/**
 * @param {string} [name]
 */
export function getPaymentProvider(name) {
  const key = name || config.paymentsProvider || 'mock';
  const provider = providers[key];
  if (!provider) {
    return mockProvider;
  }
  return provider;
}

export { mockProvider, razorpayProvider };
export default { getPaymentProvider, mockProvider, razorpayProvider };

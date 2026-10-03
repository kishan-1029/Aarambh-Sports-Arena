/**
 * Master data: India, five states, three cities on each state.
 * Upsert so running the seed again updates the same rows instead of duplicating them.
 */
import Country from '../../models/Country.js';
import State from '../../models/State.js';
import City from '../../models/City.js';
import { logger } from '../lib/logger.js';

export const INDIA_STATES = [
  {
    stateName: 'Gujarat',
    stateCode: 'GJ',
    cities: [
      { cityName: 'Ahmedabad', cityCode: 'AMD' },
      { cityName: 'Vadodara', cityCode: 'BDQ' },
      { cityName: 'Surat', cityCode: 'STV' },
    ],
  },
  {
    stateName: 'Maharashtra',
    stateCode: 'MH',
    cities: [
      { cityName: 'Mumbai', cityCode: 'BOM' },
      { cityName: 'Pune', cityCode: 'PNQ' },
      { cityName: 'Nagpur', cityCode: 'NAG' },
    ],
  },
  {
    stateName: 'Rajasthan',
    stateCode: 'RJ',
    cities: [
      { cityName: 'Jaipur', cityCode: 'JAI' },
      { cityName: 'Udaipur', cityCode: 'UDR' },
      { cityName: 'Jodhpur', cityCode: 'JDH' },
    ],
  },
  {
    stateName: 'Karnataka',
    stateCode: 'KA',
    cities: [
      { cityName: 'Bengaluru', cityCode: 'BLR' },
      { cityName: 'Mysuru', cityCode: 'MYQ' },
      { cityName: 'Mangaluru', cityCode: 'IXE' },
    ],
  },
  {
    stateName: 'Tamil Nadu',
    stateCode: 'TN',
    cities: [
      { cityName: 'Chennai', cityCode: 'MAA' },
      { cityName: 'Coimbatore', cityCode: 'CJB' },
      { cityName: 'Madurai', cityCode: 'IXM' },
    ],
  },
];

async function dropLegacyStateNameIndex() {
  try {
    await State.collection.dropIndex('StateName_1');
    logger.info('dropped legacy StateName index');
  } catch (err) {
    if (err?.codeName !== 'IndexNotFound' && err?.code !== 27) {
      throw err;
    }
  }
}

export async function seedMasterLocations() {
  const country = await Country.findOneAndUpdate(
    { countryName: 'India' },
    { $set: { countryName: 'India', countryCode: 'IN', isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await dropLegacyStateNameIndex();

  const blankName = { $in: [null, ''] };
  await State.deleteMany({
    $or: [{ stateName: { $exists: false } }, { stateName: blankName }],
  });
  await City.deleteMany({
    $or: [{ cityName: { $exists: false } }, { cityName: blankName }],
  });

  await State.updateMany(
    { stateCode: { $in: INDIA_STATES.map((s) => s.stateCode) } },
    { $set: { countryId: country._id, isActive: true } },
  );

  let cityCount = 0;
  for (const spec of INDIA_STATES) {
    const state = await State.findOneAndUpdate(
      { countryId: country._id, stateCode: spec.stateCode },
      {
        $set: {
          stateName: spec.stateName,
          stateCode: spec.stateCode,
          countryId: country._id,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    for (const city of spec.cities) {
      await City.findOneAndUpdate(
        { stateId: state._id, cityName: city.cityName },
        {
          $set: {
            cityName: city.cityName,
            cityCode: city.cityCode,
            stateId: state._id,
            countryId: country._id,
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      cityCount += 1;
    }
  }

  logger.info(
    { country: country.countryName, states: INDIA_STATES.length, cities: cityCount },
    'seeded master states and cities',
  );
  return { country, states: INDIA_STATES.length, cities: cityCount };
}

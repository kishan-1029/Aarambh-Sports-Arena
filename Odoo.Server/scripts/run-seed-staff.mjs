import { connectDb, disconnectDb } from '../src/lib/db.js';
import mongoose from 'mongoose';
import { seedStaff } from '../src/seed/seedStaff.js';

await connectDb();
const col = mongoose.connection.collection('employees');
const junk = await col
  .find({ $or: [{ email: null }, { email: { $exists: false } }] })
  .project({ emailOffice: 1, email: 1, employeeName: 1 })
  .toArray();
console.log('junk employees', junk);
for (const doc of junk) {
  if (!doc.emailOffice) {
    await col.deleteOne({ _id: doc._id });
  } else {
    await col.updateOne({ _id: doc._id }, { $set: { email: doc.emailOffice } });
  }
}
const r = await seedStaff();
console.log(JSON.stringify(r, null, 2));
await disconnectDb();

import mongoose from 'mongoose';
import { MONGO_URI } from '$env/static/private';
mongoose.connect(MONGO_URI);

export { mongoose };

const officialReportSchema = new mongoose.Schema({
    text: { type: String, required: true },
    expireAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});
export const OfficialReport = mongoose.models.OfficialReport || mongoose.model('OfficialReport', officialReportSchema);

const reportSchema = new mongoose.Schema({
    line: { type: String, required: true },
    time: { type: Number, required: true },
    crowdedness: {
        type: String,
        enum: ['almost_empty', 'empty_seats', 'seats_full', 'crowded', 'overcrowded'],
        required: true
    }
});

export const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

const CourseSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  notification: {
    type: Boolean,
    default: false
  }
});

const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    rec_code: {type: String, default:  "NULL"},
    isAdmin: { type: Boolean, default: false },
    isGoogleAuthenticated: { type: Boolean, default: false },
    isConfirmed: { type: Boolean, default: false },
    courses: [CourseSchema],
    notificationsAdvance: {type: Number, default: 0},
});
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
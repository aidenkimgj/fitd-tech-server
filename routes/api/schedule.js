import express from 'express';
const router = express.Router();
import auth from '../../middleware/auth';

// Model
import NewCoach from '../../models/newCoach';
import User from '../../models/user';

//========================================
//         Schedule Api
// Author: Aiden Kim, Donghyun(Dean) Kim
//========================================

/*
 * @route     POST   api/schedule/book
 * @desc      Set schedule
 * @access    Private
 *
 */

router.post('/book', auth, async (req, res, next) => {
  const { coachId, selectedEvents } = req.body;
  const user = req.user;

  try {
    const bookedUser = await User.findByIdAndUpdate(
      user._id,
      { events: [...user._events, selectedEvents] },
      { new: true }
    );
    const coach = await NewCoach.findById(coachId);

    selectedEvents.map(event =>
      coach.update(
        { 'events.id': event.id },
        { $set: { 'events.$': { booked: true } } }
      )
    );
    coach.save(err => {
      if (err) return res.status(400).json({ success: false, err });
    });

    res.json({ message: 'Booking Completed', success: true, user: bookedUser });
  } catch (e) {
    console.error(e);
    next(e);
  }
});

routher.post('/manage-coach-schedule', auth, async (req, res, next) => {
  const { changedEvents } = req.body;

  if (req.user.role !== 2)
    res.status(400).json({ error: true, message: 'Unauthorized' });
});

export default router;

import Notification from '../models/Notification.js';

// Lazily bound so this module has no import-order dependency on sockets/index.js
let pushToUser = null;
export const bindNotificationPusher = (fn) => {
  pushToUser = fn;
};

export const notify = async ({ recipient, actor, type, document, comment, message }) => {
  if (String(recipient) === String(actor)) return null; // don't notify yourself

  const notification = await Notification.create({
    recipient,
    actor,
    type,
    document,
    comment,
    message,
  });

  const populated = await notification.populate('actor', 'name penColor avatarUrl');

  if (pushToUser) {
    pushToUser(String(recipient), {
      type: 'notification:new',
      payload: populated,
    });
  }

  return populated;
};

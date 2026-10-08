import { handleContact } from '../src/server/contact.js';

export function onRequest(context) {
  return handleContact(context.request, context.env);
}

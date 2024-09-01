import { boomify } from '@hapi/boom';
import { type Response, Router } from 'express';
import authenticate, { type IUserRequest } from 'middleware/authMiddleware';
import wrapHandler from 'utils/wrapHandler';

import Contact from 'models/contactModel';

const LOG = 'STARTER_CHATTING_LOG:';
const router = Router();

const getContacts = async (req: IUserRequest, res: Response) => {
  try {
    const ownerContact = req.user.id;
    const contact = await Contact.findOne({ owner: ownerContact })
      .select('contactList')
      .populate('contactList', 'name email')
      .exec();

    if (!contact) {
      return res.status(200).json({ message: 'NO_CONTACTS', data: { contactList: [] } });
    }

    return res.status(200).json({ message: 'Success get all contact', data: { contactList: contact.contactList } });
  } catch (error: any) {
    console.error(`${LOG} GET_CONTACTS ${error}`);
    const err = boomify(error);
    return res.status(err.output.statusCode).send(err.output.payload);
  }
};

const addContact = async (req: IUserRequest, res: Response) => {
  try {
    const ownerContact = req.user;
    const { contactId } = req.body;

    // check if contact is already in the user's contact list
    const existingContact = await Contact.findOne({ owner: ownerContact.id, contactList: contactId }).exec();
    if (existingContact) {
      return res.status(200).json({ message: 'CONTACT_EXISTS' });
    }

    // if user has no contacts, create a new one and if user has contacts, add to the existing one
    await Contact.findOneAndUpdate(
      { owner: ownerContact.id },
      { $addToSet: { contactList: contactId } },
      { upsert: true, new: true }
    ).exec();

    return res.status(201).json({ message: 'ADD_CONTACT' });
  } catch (error: any) {
    console.error(`${LOG} ADD_CONTACT ${error}`);
    const err = boomify(error);
    return res.status(err.output.statusCode).send(err.output.payload);
  }
};

router.get('/contacts', authenticate, wrapHandler(getContacts));
router.post('/contacts', authenticate, wrapHandler(addContact));

export default router;

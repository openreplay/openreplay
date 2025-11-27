export const mutationTypes = {
  identity: 'identity',
  deleteUser: 'delete_user',
  setProperty: 'set_property',
  setPropertyOnce: 'set_property_once',
  appendProperty: 'append_property',
  appendUniqueProperty: 'append_unique_property',
  incrementProperty: 'increment_property',
}

export const categories = {
  people: 'user_actions',
  events: 'events',
}

export const createEvent = (
  category: (typeof categories)[keyof typeof categories],
  type: (typeof mutationTypes)[keyof typeof mutationTypes],
  timestamp?: number,
  payload?: Record<string, any>,
) => ({
  category,
  data: {
    type,
    timestamp,
    payload,
  },
})

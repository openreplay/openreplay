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
  type?: (typeof mutationTypes)[keyof typeof mutationTypes],
  timestamp?: number,
  payload?: Record<string, any>,
) => {
  if (category === categories.people) {
    return {
      category,
      data: {
        type,
        user_id: payload!.user_id,
        payload: payload!.properties,
        timestamp,
      },
    }
  } else {
    if (!payload) {
      throw new Error('Payload is required for event creation')
    }
    return {
      category,
      data: {
        name: payload.name,
        payload: payload.properties,
        timestamp,
      },
    }
  }
}

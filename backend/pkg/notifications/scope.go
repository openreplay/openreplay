package notifications

const audienceFilter = `(notifications.user_id IS NULL OR notifications.user_id = @userId)`

# Command submission

When a user submits a slash command, the UI expands it into a complete prompt
and sends that prompt to the daemon. The daemon runs the request and streams
the result back to the UI, where it is displayed to the user.

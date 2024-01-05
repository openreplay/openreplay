
# LLM Request formula:
## {role: user/system/assistant, content: message}
summary_context = "All answers must use key values found in the data given by the user. Explain briefly."

question_format_paragraph = "{0}\nBriefly summarize user behaviour and the issues and errors of the session into two paragraphs"
question_format = "{0}\nBriefly summarize user behaviour and the issues and errors of the session into two set of bullet point enumerations"

summary_example_user_input = """{'userBehaviour': 'User started navigation from site: `/5638/sessions`, and ended in: /5638/session/2525868986424723708. They visited 17 pages during the session. The session lasted around 44 minute(s). The user spent most of the time in the page: `/5638/session/2525868986424723708` (~39%).', 'IssuesAndErrors': 'There were click rages in the button `Filter by keyword` 5 times during the session. Erratic movements were noticed, indication possible confusion or annoyance, primarly on page `https://app.openreplay.com/5638/session/2527493737085558990`. There were some failed network requests to `https://asayer-mobs.s3.amazonaws.com/[...]`. '}"""

summary_example_ai_response = """1. User Behavior:
        * The user started their navigation from the page `/5638/sessions` and ended on `/5638/session/2525868986424723708`.
        * The user visited 17 pages during the session.
        * The session lasted approximately 44 minutes.
        * The user spent most of their time on the page `/5638/session/2525868986424723708` (~39%).
2. Issues and Errors:
        * There were 5 instances of click rage on the `Filter by keyword` button during the session.
        * The user exhibited erratic movements, indicating possible confusion or annoyance, primarily on the page `https://app.openreplay.com/5638/session/2527493737085558990`.
        * There were some failed network requests to `https://asayer-mobs.s3.amazonaws.com/[...]`."""

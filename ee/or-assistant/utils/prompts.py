session_summary_base_prompt_long = """"Afterwards we received the following events:\n{event_list_json}\nContinue the summary of what the user was doing based on the events, make a brief summary"""
# Maybe set previous summary description as context instead of prompt begining
session_summary_base_prompt = """{event_list_json}\nMake a brief summary of the user behaviour using the list of events shown previously."""

# LLM Request formula:
## {role: user/system/assistant, content: message}
summary_context = "You are an AI assistant that summarize json invents into user behaviour. You have to give an overall view of what where the issues the user encounter, what was he trying to achieve and in which page he spent most of the time on. Be as concise as possible and answer in few words."

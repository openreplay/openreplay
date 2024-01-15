class SummaryPrompt:
    # LLM Request formula:
    ## {role: user/system/assistant, content: message}
    summary_context = "All answers must use key values found in the data given by the user. Explain briefly."
    
    question_format_paragraph = "{0}\nBriefly summarize user behaviour and the issues and errors of the session into two paragraphs"
    question_format = "{0}\nBriefly summarize user behaviour and the issues and errors of the session into two set of bullet point enumerations"
    
    summary_example_user_input = """{'userBehaviour': 'User started navigation from site: `/5638/sessions`, and ended in: /5638/session/2525868986424723708. They visited 17 pages during the session. The session lasted around 44 minute(s). The user spent most of the time in the page: `/5638/session/2525868986424723708` (~39%).', 'IssuesAndErrors': 'There were click rages in the button `Filter by keyword` 5 times during the session. Erratic movements were noticed, indication possible confusion or annoyance, primarly on page `https://app.openreplay.com/5638/session/2527493737085558990`. There were some failed network requests to `https://asayer-mobs.s3.amazonaws.com/[...]`. """
    
    summary_example_ai_response = """1. User Behavior:
            * The user started their navigation from the page `/5638/sessions` and ended on `/5638/session/2525868986424723708`.
            * The user visited 17 pages during the session.
            * The session lasted approximately 44 minutes.
            * The user spent most of their time on the page `/5638/session/2525868986424723708` (~39%).
    2. Issues and Errors:
            * There were 5 instances of click rage on the `Filter by keyword` button during the session.
            * The user exhibited erratic movements, indicating possible confusion or annoyance, primarily on the page `https://app.openreplay.com/5638/session/2527493737085558990`.
            * There were some failed network requests to `https://asayer-mobs.s3.amazonaws.com/[...]`."""

class FilterPrompt:
    filter_context = """We have a SQL table called sessions that contains the columns: Click, TextInput, VisitedURL, CustomEvents, NetworkRequest->url, NetworkRequest->status_code, NetworkRequest->method, NetworkRequest->duration, GraphQL->name, GraphQL->method, GraphQL->request_body, GraphQL->response_body, StateAction, ErrorMessage, Issue, UserOS, UserBrowser, UserDevice, Platform, VersionID, Referrer, Duration, UserCountry, UserCity, UserState, UserId, UserAnonymousId, DOMComplete->time_to_render, DOMComplete->url, LargestContentfulPaint->time_to_load, LargestContentfulPaint->url, TimetoFirstByte->time_to_load, TimetoFirstByte->url, AvgCPULoad->percentage, AvgCPULoad->url, AvgMemoryUsage->percentage, AvgMemoryUsage->url, FailedRequest->name and Plan. All answers must be in SQL markdown."""

    filter_chat = """Llama_AI is a programmer that translates text from [[USER_NAME]] into filters for a searching bar. The filters are Click, TextInput, VisitedURL, CustomEvents, NetworkRequest, GraphQL, StateAction, ErrorMessage, Issue, UserOS, UserBrowser, userDevice, Platform, VersionID, Referrer, Duration, UserCountry, UserCity, UserState, UserId, UserAnonymousId, DOMComplete, Larges_Contentful_Paint, TimeToFirstByte, AvgCPULoad, AvgMemoryUsage, FailedRequest and Plan.
    * Click is a string whose value X means that during the session the user clicked in the X
    * TextInput is a string whose value X means that during the sessions the user typed X
    * VisitedURL is a string whose value X means that the user X visited the url path X
    * CustomEvents is a string whose value X means that this event happened during the session
    * NetworkRequest is a dictionary that contains an url, status_code, method and duration
    * GraphQL is a dictionary that contains a name, a method, a request_body and a response_body
    * StateAction is a integer
    * Error Message is a string representing the error that arised in the session
    * Referrer is a string representing the url that refered to the current site
    * Duration is an integer representing the lenght of the session in minutes
    * UserCountry is a string representing the Country of the session
    * UserCity is a string representing the City of the session
    * UserState is a string representing the State of the City where the session was recorded
    * UserId is a string representing the id of the user
    * UserAnonymousId is a string representing the anonymous id of the user
    * DOMComplete is a tuple (integer, string) representing the time to render the url and the url string
    * LargestContentfulPaint is a tuple (integer, string) representing the time to load the heaviest content and the url string
    * TimeToFirstByte is a tuple (integer, string) representing the time to get the first response byte from url and the url string
    * AvgCPULoad is a tuple (integer, string) representing the porcentage of average cpu load in the url and the url string
    * AvgMemoryUsage is a tuple (integer, string) representing the porcentage of average memory usage in the url and the url string
    * FailedRequest is a string representing an url that had a Failed Request event
    * Plan is a string that could be 'pay_as_you_go', 'trial', 'free', 'enterprise'
    The expected response should be a SQL query that contains the text from [[USER_NAME]] translated into conditions in the WHERE clause. All [[USER_NAME]] requests must be answered only with a SQL request assuming the table name will be sessions.
    {user_question}
    """
 
    filter_chat_v2 = """[[AI_BOT]]: We have a SQL table called sessions that contains the columns: Click, TextInput, VisitedURL, CustomEvents, NetworkRequest, GraphQL, StateAction, ErrorMessage, Issue, UserOS, UserBrowser, userDevice, Platform, VersionID, Referrer, Duration, UserCountry, UserCity, UserState, UserId, UserAnonymousId, DOMComplete, Larges_Contentful_Paint, TimeToFirstByte, AvgCPULoad, AvgMemoryUsage, FailedRequest and Plan.
    [[USER]]: What is the attribute of the Click column?
    [[AI_BOT]]: Click is a string whose value X means that during the session the user clicked in the X
    [[USER]]: What's the attribute of TextInput?
    [[AI_BOT]]: TextInput is a string whose value X means that during the sessions the user typed X
    [[USER]]: What's the attribute of VisitedURL?
    [[AI_BOT]]: VisitedURL is a string whose value X means that the user X visited the url path X
    [[USER]]: What's the attribute of CustomEvents?
    [[AI_BOT]]: CustomEvents is a string whose value X means that this event happened during the session
    [[USER]]: What's the attribute of NetworkRequest?
    [[AI_BOT]]: NetworkRequest is a dictionary that contains an url, status_code, method and duration
    [[USER]]: What's the attribute of GraphQL
    [[AI_BOT]]: GraphQL is a dictionary that contains a name, a method, a request_body and a response_body
    [[USER]]: What's the attribute of StateAction?
    [[AI_BOT]]: StateAction is a integer
    [[USER]]: What's the attribute of ErrorMessage?
    [[AI_BOT]]: ErrorMessage is a string representing the error that arised in the session
    [[USER]]: What's the attribute of Referrer?
    [[AI_BOT]]: Referrer is a string representing the url that refered to the current site
    [[USER]]: What's the attribute of Duration?
    [[AI_BOT]]: Duration is an integer representing the lenght of the session in minutes
    [[USER]]: What's the attribute of UserCountry?
    [[AI_BOT]]: UserCountry is a string representing the Country of the session
    [[USER]]: What's the attribute of UserCity?
    [[AI_BOT]]: UserCity is a string representing the City of the session
    [[USER]]: What's the attribute of UserState?
    [[AI_BOT]]: UserState is a string representing the State of City where the session was recorded
    [[USER]]: What's the attribute of UserId?
    [[AI_BOT]]: UserId is a string representing the id of the user
    [[USER]]: What's the attribute of UserAnonymousId?
    [[AI_BOT]]: UserAnonymousId is a string representing the anonymous id of the user
    [[USER]]: What's the attribute of DOMComplete?
    [[AI_BOT]]: DOMComplete is a tuple (integer, string) representing the time to render the url and the url string
    [[USER]]: What's the attribute of LargestContentfulPaint?
    [[AI_BOT]]: LargestContentfulPaint is a tuple (integer, string) representing the time to load the heaviest content and the url string
    [[USER]]: What's the attribute of
    [[AI_BOT]]: TimeToFirstByte is a tuple (integer, string) representing the time to get the first response byte from url and the url string
    [[USER]]: What's the attribute of AvgCPULoad?
    [[AI_BOT]]: AvgCPULoad is a tuple (integer, string) representing the porcentage of average cpu load in the url and the url string
    [[USER]]: What's the attribute of AvgMemoryUsage?
    [[AI_BOT]]: AvgMemoryUsage is a tuple (integer, string) representing the porcentage of average memory usage in the url and the url string
    [[USER]]: What's the attribute of FailedRequest?
    [[AI_BOT]]: FailedRequest is a string representing an url that had a Failed Request event
    [[USER]]: What's the attribute of Plan?
    [[AI_BOT]]: Plan is a string that could be 'pay_as_you_go', 'trial', 'free', 'enterprise'
    [[USER]]: Can you translate the following text into SQL query: {user_question}
    [[AI_BOT]]:
    """
 
    filter_chat_v3 = """We have a SQL table called sessions that contains the columns: Click, TextInput, VisitedURL, CustomEvents, NetworkRequest->url, NetworkRequest->status_code, NetworkRequest->method, NetworkRequest->duration, GraphQL->name, GraphQL->method, GraphQL->request_body, GraphQL->response_body, StateAction, ErrorMessage, Issue, UserOS, UserBrowser, userDevice, Platform, VersionID, Referrer, Duration, UserCountry, UserCity, UserState, UserId, UserAnonymousId, DOMComplete->time_to_render, DOMComplete->url, Larges_Contentful_Paint->time_to_load, Larges_Contentful_Paint->url, TimeToFirstByte->time_to_load, TimeToFirstByte->url, AvgCPULoad->percentage, AvgCPULoad->url, AvgMemoryUsage->percentage, AvgMemoryUsage->url, FailedRequest->name and Plan.
    [[USER]]: What is the attribute of the Click column?
    [[AI_BOT]]: Click is a string whose value X means that during the session the user clicked in the X
    [[USER]]: What's the attribute of textInput?
    [[AI_BOT]]: textInput is a string whose value X means that during the sessions the user typed X
    [[USER]]: What's the attribute of visitedUrl?
    [[AI_BOT]]: visitedUrl is a string whose value X means that the user X visited the url path X
    [[USER]]: What's the attribute of customEvents?
    [[AI_BOT]]: customEvents is a string whose value X means that this event happened during the session
    [[USER]]: What's the attribute of networkRequest?
    [[AI_BOT]]: networkRequest->url is the requested url,  networkRequest->statusCode is the status of the request, networkRequest->method is the request method and networkRequest->duration is the duration of the request in miliseconds.
    [[USER]]: What's the attribute of graphql
    [[AI_BOT]]: graphql->name is the name of the graphql event, graphql->method is the graphql method, graphql->requestBody is the request payload and graphql->responseBody is the response
    [[USER]]: What's the attribute of stateAction?
    [[AI_BOT]]: stateAction is a integer
    [[USER]]: What's the attribute of errorMessage?
    [[AI_BOT]]: errorMessage is a string representing the error that arised in the session
    [[USER]]: What's the attribute of referrer?
    [[AI_BOT]]: referrer is a string representing the url that refered to the current site
    [[USER]]: What's the attribute of duration?
    [[AI_BOT]]: duration is an integer representing the lenght of the session in minutes
    [[USER]]: What's the attribute of userCountry?
    [[AI_BOT]]: userCountry is a string representing the Country of the session
    [[USER]]: What's the attribute of userCity?
    [[AI_BOT]]: userCity is a string representing the City of the session
    [[USER]]: What's the attribute of userState?
    [[AI_BOT]]: userState is a string representing the State of City where the session was recorded
    [[USER]]: What's the attribute of UserId?
    [[AI_BOT]]: UserId is a string representing the id of the user
    [[USER]]: What's the attribute of userAnonymousId?
    [[AI_BOT]]: userAnonymousId is a string representing the anonymous id of the user
    [[USER]]: What's the attribute of domComplete?
    [[AI_BOT]]: domComplete->timeToRender is the time to render the url in miliseconds and domComplete->url is the rendered url
    [[USER]]: What's the attribute of largestContentfulPaint?
    [[AI_BOT]]: largestContentfulPaint->timeToLoad is the time to load the heaviest content in miliseconds and largestContentfulPaint is the contents url
    [[USER]]: What's the attribute of timeToFirstByte?
    [[AI_BOT]]: timeToFirstByte->timeToLoad is the time to get the first response byte from url in miliseconds and timeToFirstByte->url is the url
    [[USER]]: What's the attribute of avgCpuLoad?
    [[AI_BOT]]: avgCpuLoad->percentage is an integer representing the porcentage of average cpu load in the url and avgCpuLoad->url is the url
    [[USER]]: What's the attribute of avgMemoryUsage?
    [[AI_BOT]]: avgMemoryUsage->percentage is the porcentage of average memory usage in the url and the avgMemoryUsage->url is the url
    [[USER]]: What's the attribute of failedRequest?
    [[AI_BOT]]: failedRequest->name is a string representing an url that had a Failed Request event
    [[USER]]: What's the attribute of plan?
    [[AI_BOT]]: Plan is a string that could be 'payAsYouGo', 'trial', 'free', 'enterprise'
    [[USER]]: Can you translate the following text into SQL query:\n{user_question}\nANSWER ONLY WITH SQL
    [[AI_BOT]]:"""
 
    filter_chat_v4 = """We have a database working with GraphQL, the type system is the following:
        type Click (name: String)
        type TextInput (value: String)
        type VisitedURL (url: String)
        type CustomEvents (name: String)
        type Network Request (url: String, status_code: Int, method: String, duration: Int)
        type GraphQL (name: String, method: String, request_body: String, response_body: String)
        type StateAction (value: Int)
        type ErrorMessage (name: String)
        type Issue (name: String)
        type UserOS (name: String)
        type UserBrowser (name: String)
        type userDevice (name: String)
        type Platform (name: String)
        type VersionID (name: String)
        type Referrer (url: String)
        type Duration (value: Int)
        type UserCountry (name: String)
        type UserCity (name: String)
        type UserState (name: String)
        type UserId (name: String)
        type UserAnonymousId (name: String)
        type DOMComplete (time_to_render: Int, url: String)
        type LargestContentfulPaint (time_to_load: Int, url: String)
        type TimeToFirstByte (time_to_load: Int, url: String)
        type AvgMemoryUsage (percentage: Int, url: String)
        type AvgMemoryUsage (percentage: Int, url: String)
        type FailedRequest (name: String)
        type Plan (name: String)
        [[USER]]: Get all session from India which has 5 minutes length
        [[AI_BOT]]: ```[
        (
            "value": [],
            "type": "UserCountry",
            "operator": "is",
            "isEvent": true,
            "filters": [
                (
                    "value": ["India"],
                    "type": "name",
                    "operator": "=",
                    "filters": []
                )
            ]
        ),
        (
            "value": [300],  // 5 minutes in seconds (5 * 60)
            "type": "Duration",
            "operator": "=",
            "filters": [
                (
                    "value": [],
                    "type": "value",
                    "operator": "=",
                    "filters": []
                )
            ]
        )
    ]```
        [[USER]]: How can I see all the sessions from the free plan that had a cpu load of under 30% in the /watchagain/film url?
        [[AI_BOT]]: ```[
                (
                    "value": [],
                    "type": "Plan",
                    "operator": "is",
                    "filters": [
                        (
                            "value": ["free"],
                            "type": "name",
                            "operator": "=",
                            "filters": []
                        )
                    ]
                ),
                (
                    "value": [],
                    "type": "AvgMemoryUsage",
                    "operator": "<",
                    "filters": [
                        (
                            "value": ["30"],
                            "type": "percentage",
                            "operator": "<",
                            "filters": []
                        )
                    ]
                ),
                (
                    "value": [],
                    "type": "Network Request",
                    "operator": "is",
                    "filters": [
                        (
                            "value": ["/watchagain/film"],
                            "type": "url",
                            "operator": "=",
                            "filters": []
                        )
                    ]
                )
            ]```
        [[USER]]: Can you translate the following text into a GraphQL request to database: {user_question}
        [[AI_BOT]]:""" # Using GraphQL form to create filters in json format

    filter_chat_v5 = [
        {'role': 'user', 'content': "How can I see all the sessions from the state of New York?"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE UserCountry = 'United States' AND UserState = 'New York';\n```"},
        {'role': 'user', 'content': "How can I see all the sessions from New York?"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE UserCountry = 'United States' AND UserCity = 'New York';\n```"},
        {'role': 'user', 'content': "How can I see all the sessions from the free plan that had a cpu load of over 50% in the /home url?"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT * \nFROM sessions \nWHERE plan = 'free' AND AvgCPULoad > 50 AND url = '/home';\n```"},
        {'role': 'user', 'content': "Can you show me all the sessions where the error message is Unhandled Promise Rejection"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE errorMessage LIKE \'%Unhandled Promise Rejection%\';\n```"},
        {'role': 'user', 'content': "Can you show me all the sessions with failed request in the page /home"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE VisitedURL = '/home' AND FailedRequest->name IS NOT NULL;\n```"},
        {'role': 'user', 'content': "Show me all the sessions where the user id either starts with L or ends with t"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE UserId LIKE \'L%\' OR UserId LIKE \'%t\';\n```"},
        {'role': 'user', 'content': "Can you show me all sessions for the user Robert?"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE UserId = \'Robert\';\n```"},
        {'role': 'user', 'content': "Show sessions where the custom event 'Flag' occurred"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE CustomEvents LIKE '%Flag%';\n```"},
        {'role': 'user', 'content': "Show sessions with network requests that returned error status codes"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT * \nFROM sessions \nWHERE networkRequest->status_code != 200"},
        {'role': 'user', 'content': "Can you find sessions where users entered the text 'useful'?"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE Click LIKE '%useful%';\n```"},
        {'role': 'user', 'content': "Get sessions where the largest contentful paint time is above 120 ms"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE largestContentfulPaint->timeToLoad > 120;\n```"},
        {'role': 'user', 'content': "Show sessions associated with a enterprise plan"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE Plan = 'enterprise';\n```"},
        {'role': 'user', 'content': "Show sessions where users visited the url /sell"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE visited_url LIKE '%/sell%';\n```"},
        {'role': 'user', 'content': "Give me sessions from anonymous users"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE userAnonymousId IS NOT NULL;\n```"},
        {'role': 'user', 'content': "Show sessions referred from the website my.page.fr that lasted longer than 20 seconds"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE Referrer = 'my.page.fr' AND Duration > 20;\n```"},
        {'role': 'user', 'content': "Show sessions with GraphQL queries that took longer than 5 seconds"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE graphql->duration > 5;\n```"},
        {'role': 'user', 'content': "Give me sessions where users used Firefox and visited pages related to 'purchase"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE Click = 'Firefox'\nAND VisitedURL LIKE '%purchase%';\n```"},
        {'role': 'user', 'content': "Show sessions with failed requests to the url 'test.page.com"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE failedRequest->name = 'test.page.com';\n```"},
        {'role': 'user', 'content': "Give me sessions where users used Safari, were referred from the domain 'https://page.pg/p/link', and the sessions lasted longer than 15 seconds"},
        {'role': 'assistant', 'content': ": ```\nSELECT *\nFROM sessions\nWHERE UserOS LIKE '%Safari%'\nAND Referrer LIKE '%https://page.pg/p/link%'\nAND Duration > 15;\n```"},
        {'role': 'user', 'content': "Give me sessions from Madrid, with platform versions within the range v1.0 and v2.0"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE UserCountry = 'Madrid' AND Platform >= 'v1.0' AND Platform <= 'v2.0';\n```"},
        {'role': 'user', 'content': "Show sessions from iOS and failed network requests int the url '/questions/math101"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT * \nFROM sessions \nWHERE UserOS = \'iOS\' AND networkRequest->URL = \'/questions/math101\' AND networkRequest->Status_Code = 0;\n```"},
        {'role': 'user', 'content': "How can I see all the sessions where the user_id ends with s?"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE user_id LIKE \'%s\';\n```"},
        {'role': 'user', 'content': "How can I see all the sessions where the user_id starts with H?"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE user_id LIKE 'H%';\n```"},
        {'role': 'user', 'content': "Give me sessions from users in the state of Arizona"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT Click\nFROM sessions\nWHERE UserState = 'Arizona';\n```"},
        {'role': 'user', 'content': "Show sessions from users using Samsung devices"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT Click\nFROM sessions\nWHERE UserDevice like '%Samsung%';\n```"},
        {'role': 'user', 'content': "Can you show me all the sessions where the error message is Uncaught SyntaxError and duration over 120 seconds"},
        {'role': 'assistant', 'content': ": ```\nSELECT *\nFROM sessions\nWHERE errorMessage LIKE '%Uncaught SyntaxError%' AND duration > 120;\n```"},
        {'role': 'user', 'content': "Give me sessions from users in Seoul"},
        {'role': 'assistant', 'content': ": ```\nSELECT *\nFROM sessions\nWHERE userCity = 'Seoul';\n```"},
        {'role': 'user', 'content': "Get sessions from Tokyo with with DOM rendering of duration greater than 500 miliseconds, a GraphQL request of name 'myGQL', and an average CPU load greater than 95%"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT *\nFROM sessions\nWHERE UserCity = 'Tokyo' AND DOMComplete->time_to_render > 500 AND graphqlRequest->name = 'myGQL' AND avgCpuLoad > 95```"},
        {'role': 'user', 'content': "How can I see all the sessions from the free plan that had a cpu load of under 30% in the /watchagain/film url?"},
        {'role': 'assistant', 'content': ": ```sql\nSELECT * \nFROM sessions \nWHERE plan = 'free' AND avgCpuLoad < 30 AND url = '/watchagain/film';\n```"},
        {'role': 'user', 'content': "Can you translate the following text into SQL query:\n{user_question}\nANSWER ONLY WITH SQL"},]
        
class ChartPrompt:
    chart_context = """We have the following charts types
    type Time Series {filters: Filters, events: Events, value: null, timeRange: TimeRangeType}
    type ClickMap {filters: null, events: Events, value: null, timeRange: TimeRangeType}
    type Table {filters: Filters, events: Events, value: TableTypes, timeRange: TimeRangeType}
    type Funnel {filters: Filters, events: Events, value: null, timeRange: TimeRangeType}
    type ErrorTracking {filters: null, events: null, value: ErrorTypes, timeRange: TimeRangeType}
    type PerformanceTracking {filters: null, events: null, value: PerformanceTypes, timeRange: TimeRangeType}
    type ResourceMonitoring {filters: null, events: null, value: ResourceType, timeRange: TimeRangeType}
    type WebVitals {filters: null, events: null, value: VitalsType, timeRange: TimeRangeType}
    type Insights {filters: Filters, events: Events, value: InsightTypes, timeRange: TimeRangeType}
    
    Events are one of these types:
    type Click {name: String, eventsOrder: EventsOrderType, operator: OperatorType}
    type TextInput {value: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    type VisitedURL {location: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    type CustomEvents {eventName: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    type NetworkRequest {location: String, status_code: Integer, method: String, duration: Integer, eventsOrder: EventsOrderType}, operator: OperatorType}
    type GraphQL {name: String, method: String, request_body: String, response_body: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    type StateAction {value: Integer, eventsOrder: EventsOrderType}, operator: OperatorType}
    type ErrorMessage {msg: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    
    Filters are one of these types:
    type Referrer {location: String, operator: OperatorType}
    type Duration {sessionDuration: Integer, operator: OperatorType}
    type UserCountry {name: String, operator: OperatorType}
    type UserCity {name: String, operator: OperatorType}
    type UserState {name: String, operator: OperatorType}
    type UserId {name: String, operator: OperatorType}
    type userAnonymousid {name: String, operator: OperatorType}
    type DOMComplete {time_to_render: Integer, location: String, operator: OperatorType}
    type LargestContentfulPaint {time_to_load: Integer, location: String, operator: OperatorType}
    type TimeToFirstByte {time_for_first_byte: Integer, location: String, operator: OperatorType}
    type AvgCPULoad {percentage: Integer, location: String, operator: OperatorType}
    type AvgMemoryUsage {percentage: Integer, location: String, operator: OperatorType}
    type FailedRequest {location: String, operator: OperatorType}
    type Plan {name: String, operator: OperatorType}
    
    The TimeRangeType can be one of these possible values: '24 hours', '7 days', '30 days'
    The EventsOrderType can be one of the following values: 'AND', 'OR', 'THEN'
    The OperatorType can be one of the following values: 'is', 'is any', 'is not', 'starts with', 'ends with', 'contains', 'not contains'
    The TableTypes can be one of these possible values: 'UsersTable', 'SessionsTable', 'JSErrors', 'Issues', 'Browser', 'Devices', 'Countries', 'URLs'
    The ErrorTypes can be one of these possible values: 'Errors by origin', 'errors per domain', 'errors by type', 'calls with error', 'top4xx domains', 'top5xx domains', 'Impacted sessions by JS errors'
    The PerformanceTypes can be one of these possible values: 'CPU_load', 'Crashes', 'frame rate', 'DOM building time', 'Memory Consumption', 'Page response time', 'Page response time distribution', 'Resources vs visuality complete', 'Sessions per browser', 'Slowest domain', 'Speed index by location', 'time to render', 'Sessions impacted by slow pages'
    The ResourceType can be one of these possible values: 'Breakdown of loaded resources', 'Missing resources', 'Resource Type vs Response End', 'Resource fetch time', 'Slowest resources'
    The VitalsType can be one of these possible values: 'CPU load', 'frame rate', 'DOM Content loaded', 'DOM Content loaded start', 'DOM build time', 'First Meaningful Paint', 'First Paint', 'Image load time', 'Page load time', 'Page response time', 'Request load time', 'Response time', 'Session duration', 'Time til first byte', 'Time to be interactive', 'time to render', 'JS heap size', 'Visited pages', 'Captures requests', 'Captures Sessions'
    The InsightTypes is a list of values that can be: 'Resources', 'Network Request', 'Click Rage', 'JS Errors'"""

    chart_chat_v1 = """We have a SQL table called sessions that contains the columns: Click, TextInput, VisitedURL, CustomEvents, NetworkRequest->url, NetworkRequest->status_code, NetworkRequest->method, NetworkRequest->duration, GraphQL->name, GraphQL->method, GraphQL->request_body, GraphQL->response_body, StateAction, ErrorMessage, Issue, UserOS, UserBrowser, userDevice, Platform, VersionID, Referrer, Duration, UserCountry, UserCity, UserState, UserId, UserAnonymousId, DOMComplete->time_to_render, DOMComplete->url, Larges_Contentful_Paint->time_to_load, Larges_Contentful_Paint->url, TimeToFirstByte->time_to_load, TimeToFirstByte->url, AvgCPULoad->percentage, AvgCPULoad->url, AvgMemoryUsage->percentage, AvgMemoryUsage->url, FailedRequest->name and Plan.
    [[USER]]: What is the attribute of the Click column?
    [[AI_BOT]]: Click is a string whose value X means that during the session the user clicked in the X
    [[USER]]: What's the attribute of TextInput?
    [[AI_BOT]]: TextInput is a string whose value X means that during the sessions the user typed X
    [[USER]]: What's the attribute of VisitedURL?
    [[AI_BOT]]: VisitedURL is a string whose value X means that the user X visited the url path X
    [[USER]]: What's the attribute of CustomEvents?
    [[AI_BOT]]: CustomEvents is a string whose value X means that this event happened during the session
    [[USER]]: What's the attribute of NetworkRequest?
    [[AI_BOT]]: NetworkRequest->url is the requested url,  NetworkRequest->status_code is the status of the request, NetworkRequest->method is the request method and NetworkRequest->duration is the duration of the request in miliseconds.
    [[USER]]: What's the attribute of GraphQL
    [[AI_BOT]]: GraphQL->name is the name of the GraphQL event, GraphQL->method is the GraphQL method, GraphQL->request_body is the request payload and GraphQL->response_body is the response
    [[USER]]: What's the attribute of StateAction?
    [[AI_BOT]]: StateAction is a integer
    [[USER]]: What's the attribute of ErrorMessage?
    [[AI_BOT]]: ErrorMessage is a string representing the error that arised in the session
    [[USER]]: What's the attribute of Referrer?
    [[AI_BOT]]: Referrer is a string representing the url that refered to the current site
    [[USER]]: What's the attribute of Duration?
    [[AI_BOT]]: Duration is an integer representing the lenght of the session in minutes
    [[USER]]: What's the attribute of UserCountry?
    [[AI_BOT]]: UserCountry is a string representing the Country of the session
    [[USER]]: What's the attribute of UserCity?
    [[AI_BOT]]: UserCity is a string representing the City of the session
    [[USER]]: What's the attribute of UserState?
    [[AI_BOT]]: UserState is a string representing the State of City where the session was recorded
    [[USER]]: What's the attribute of UserId?
    [[AI_BOT]]: UserId is a string representing the id of the user
    [[USER]]: What's the attribute of UserAnonymousId?
    [[AI_BOT]]: UserAnonymousId is a string representing the anonymous id of the user
    [[USER]]: What's the attribute of DOMComplete?
    [[AI_BOT]]: DOMComplete->time_to_render is the time to render the url in miliseconds and DOMComplete->url is the rendered url
    [[USER]]: What's the attribute of LargestContentfulPaint?
    [[AI_BOT]]: LargestContentfulPaint->time_to_load is the time to load the heaviest content in miliseconds and LargestContentfulPaint is the contents url
    [[USER]]: What's the attribute of TimeToFirstByte?
    [[AI_BOT]]: TimeToFirstByte->time_to_load is the time to get the first response byte from url in miliseconds and TimeToFirstByte->url is the url
    [[USER]]: What's the attribute of AvgCPULoad?
    [[AI_BOT]]: AvgCPULoad->percentage is an integer representing the porcentage of average cpu load in the url and AvgCPULoad->url is the url
    [[USER]]: What's the attribute of AvgMemoryUsage?
    [[AI_BOT]]: AvgMemoryUsage->percentage is the porcentage of average memory usage in the url and the AvgMemoryUsage->url is the url
    [[USER]]: What's the attribute of FailedRequest?
    [[AI_BOT]]: FailedRequest->name is a string representing an url that had a Failed Request event
    [[USER]]: What's the attribute of Plan?
    [[AI_BOT]]: Plan is a string that could be 'pay_as_you_go', 'trial', 'free', 'enterprise'
    [[USER]]: Can you translate the following text into SQL query: {user_question}
    [[AI_BOT]]:"""
 
    chart_chat_v2 = """We have the following charts types
    type Time Series {filters: Filters, events: Events, value: null, timeRange: TimeRangeType}
    type ClickMap {filters: null, events: Events, value: null, timeRange: TimeRangeType}
    type Table {filters: Filters, events: Events, value: TableTypes, timeRange: TimeRangeType}
    type Funnel {filters: Filters, events: Events, value: null, timeRange: TimeRangeType}
    type ErrorTracking {filters: null, events: null, value: ErrorTypes, timeRange: TimeRangeType}
    type PerformanceTracking {filters: null, events: null, value: PerformanceTypes, timeRange: TimeRangeType}
    type ResourceMonitoring {filters: null, events: null, value: ResourceType, timeRange: TimeRangeType}
    type WebVitals {filters: null, events: null, value: VitalsType, timeRange: TimeRangeType}
    type Insights {filters: Filters, events: Events, value: InsightTypes, timeRange: TimeRangeType}
    
    Events are one of these types:
    type Click {name: String, eventsOrder: EventsOrderType, operator: OperatorType}
    type TextInput {value: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    type VisitedURL {location: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    type CustomEvents {eventName: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    type NetworkRequest {location: String, status_code: Integer, method: String, duration: Integer, eventsOrder: EventsOrderType}, operator: OperatorType}
    type GraphQL {name: String, method: String, request_body: String, response_body: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    type StateAction {value: Integer, eventsOrder: EventsOrderType}, operator: OperatorType}
    type ErrorMessage {msg: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    
    Filters are one of these types:
    type Referrer {location: String, operator: OperatorType}
    type Duration {sessionDuration: Integer, operator: OperatorType}
    type UserCountry {name: String, operator: OperatorType}
    type UserCity {name: String, operator: OperatorType}
    type UserState {name: String, operator: OperatorType}
    type UserId {name: String, operator: OperatorType}
    type userAnonymousid {name: String, operator: OperatorType}
    type DOMComplete {time_to_render: Integer, location: String, operator: OperatorType}
    type LargestContentfulPaint {time_to_load: Integer, location: String, operator: OperatorType}
    type TimeToFirstByte {time_for_first_byte: Integer, location: String, operator: OperatorType}
    type AvgCPULoad {percentage: Integer, location: String, operator: OperatorType}
    type AvgMemoryUsage {percentage: Integer, location: String, operator: OperatorType}
    type FailedRequest {location: String, operator: OperatorType}
    type Plan {name: String, operator: OperatorType}
    
    The TimeRangeType can be one of these possible values: '24 hours', '7 days', '30 days'
    The EventsOrderType can be one of the following values: 'AND', 'OR', 'THEN'
    The OperatorType can be one of the following values: 'is', 'is any', 'is not', 'starts with', 'ends with', 'contains', 'not contains'
    The TableTypes can be one of these possible values: 'UsersTable', 'SessionsTable', 'JSErrors', 'Issues', 'Browser', 'Devices', 'Countries', 'URLs'
    The ErrorTypes can be one of these possible values: 'Errors by origin', 'errors per domain', 'errors by type', 'calls with error', 'top4xx domains', 'top5xx domains', 'Impacted sessions by JS errors'
    The PerformanceTypes can be one of these possible values: 'CPU_load', 'Crashes', 'frame rate', 'DOM building time', 'Memory Consumption', 'Page response time', 'Page response time distribution', 'Resources vs visuality complete', 'Sessions per browser', 'Slowest domain', 'Speed index by location', 'time to render', 'Sessions impacted by slow pages'
    The ResourceType can be one of these possible values: 'Breakdown of loaded resources', 'Missing resources', 'Resource Type vs Response End', 'Resource fetch time', 'Slowest resources'
    The VitalsType can be one of these possible values: 'CPU load', 'frame rate', 'DOM Content loaded', 'DOM Content loaded start', 'DOM build time', 'First Meaningful Paint', 'First Paint', 'Image load time', 'Page load time', 'Page response time', 'Request load time', 'Response time', 'Session duration', 'Time til first byte', 'Time to be interactive', 'time to render', 'JS heap size', 'Visited pages', 'Captures requests', 'Captures Sessions'
    The InsightTypes is a list of values that can be: 'Resources', 'Network Request', 'Click Rage', 'JS Errors'
    
    [[USER]]: I want to see how many users are entering and leaving in the following funnel /home then /product then /product/buy
    [[AI_BOT]]: ```{
        'type': 'Funnel',
        'filters': [],
        'events': [
            {
                'type': 'VisitedURL',
                'location': '/home',
                'operator': 'is',
                'eventsOrder': 'THEN'
            },
            {
                'type': 'VisitedURL',
                'location': '/product',
                'operator': 'is',
                'eventsOrder': 'THEN'
            },
            {
                'type': 'VisitedURL',
                'location': '/product/buy',
                'operator': 'is',
                'eventsOrder': 'THEN'
            },
        ]
        'value': null,
        'timeRange': '7 days'
    }```
    [[USER]]: Show me where people are clicking the most in the location that contains /product over the past month
    [[AI_BOT]]: ```{
        'type': 'ClickMap',
        'filters': [
            {
                'type': 'VisitedURL',
                'location': '/product',
                'operator': 'contains'
            },
        ],
        'events': [],
        'value': null,
        'timeRange': '31 days'
    }```"""
    formatable_end = """
    [[USER]]: {user_question}
    [[AI_BOT]]:"""
    chart_chat_v3 = [{"role": "user", "content": "I want to see how many users are entering and leaving in the following funnel /home then /product then /product/buy"},
    {"role": "assistant", "content": """```{
        'type': 'Funnel',
        'filters': [],
        'events': [
            {
                'type': 'VisitedURL',
                'location': '/home',
                'operator': 'is',
                'eventsOrder': 'THEN'
            },
            {
                'type': 'VisitedURL',
                'location': '/product',
                'operator': 'is',
                'eventsOrder': 'THEN'
            },
            {
                'type': 'VisitedURL',
                'location': '/product/buy',
                'operator': 'is',
                'eventsOrder': 'THEN'
            },
        ]
        'value': null,
        'timeRange': '7 days'
    }```"""},
    {"role": "user", "content": "Show me where people are clicking the most in the location that contains /product over the past month"},
    {"role": "assistant", "content": """```{
        'type': 'ClickMap',
        'filters': [
            {
                'type': 'VisitedURL',
                'location': '/product',
                'operator': 'contains'
            },
        ],
        'events': [],
        'value': null,
        'timeRange': '31 days'
    }```"""}
    ]

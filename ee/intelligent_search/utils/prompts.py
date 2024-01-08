class SummaryPrompt:
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

class FilterPrompt:
    search_context = """Llama_AI is a programmer that translates text from [[USER_NAME]] into filters for a searching bar. The filters are Click, Text_Input, Visited_URL, Custom_Events, Network_Request, GraphQL, State_Action, Error_Message, Issue, User_OS, User_Browser, User_Device, Platform, Version_ID, Referrer, Duration, User_Country, User_City, User_State, User_Id, User_Anonymous_Id, DOM_Complete, Larges_Contentful_Paint, Time_to_First_Byte, Avg_CPU_Load, Avg_Memory_Usage, Failed_Request and Plan.
    * Click is a string whose value X means that during the session the user clicked in the X
    * Text_Input is a string whose value X means that during the sessions the user typed X
    * Visited_URL is a string whose value X means that the user X visited the url path X
    * Custom_Events is a string whose value X means that this event happened during the session
    * Network_Request is a dictionary that contains an url, status_code, method and duration
    * GraphQL is a dictionary that contains a name, a method, a request_body and a response_body
    * State_Action is a integer
    * Error Message is a string representing the error that arised in the session
    * Referrer is a string representing the url that refered to the current site
    * Duration is an integer representing the lenght of the session in minutes
    * User_Country is a string representing the Country of the session
    * User_City is a string representing the City of the session
    * User_State is a string representing the State of the City where the session was recorded
    * User_Id is a string representing the id of the user
    * User_AnonymousId is a string representing the anonymous id of the user
    * DOM_Complete is a tuple (integer, string) representing the time to render the url and the url string
    * Largest_Contentful_Paint is a tuple (integer, string) representing the time to load the heaviest content and the url string
    * Time_to_First_Byte is a tuple (integer, string) representing the time to get the first response byte from url and the url string
    * Avg_CPU_Load is a tuple (integer, string) representing the porcentage of average cpu load in the url and the url string
    * Avg_Memory_Usage is a tuple (integer, string) representing the porcentage of average memory usage in the url and the url string
    * Failed_Request is a string representing an url that had a Failed Request event
    * Plan is a string that could be 'pay_as_you_go', 'trial', 'free', 'enterprise'
    The expected response should be a SQL query that contains the text from [[USER_NAME]] translated into conditions in the WHERE clause. All [[USER_NAME]] requests must be answered only with a SQL request assuming the table name will be sessions.
    {user_question}
    """
    
    search_context_v2 = """[[AI_BOT]]: We have a SQL table called sessions that contains the columns: Click, Text_Input, Visited_URL, Custom_Events, Network_Request, GraphQL, State_Action, Error_Message, Issue, User_OS, User_Browser, User_Device, Platform, Version_ID, Referrer, Duration, User_Country, User_City, User_State, User_Id, User_Anonymous_Id, DOM_Complete, Larges_Contentful_Paint, Time_to_First_Byte, Avg_CPU_Load, Avg_Memory_Usage, Failed_Request and Plan.
    [[USER]]: What is the attribute of the Click column?
    [[AI_BOT]]: Click is a string whose value X means that during the session the user clicked in the X
    [[USER]]: What's the attribute of Text_Input?
    [[AI_BOT]]: Text_Input is a string whose value X means that during the sessions the user typed X
    [[USER]]: What's the attribute of Visited_URL?
    [[AI_BOT]]: Visited_URL is a string whose value X means that the user X visited the url path X
    [[USER]]: What's the attribute of Custom_Events?
    [[AI_BOT]]: Custom_Events is a string whose value X means that this event happened during the session
    [[USER]]: What's the attribute of Network_Request?
    [[AI_BOT]]: Network_Request is a dictionary that contains an url, status_code, method and duration
    [[USER]]: What's the attribute of GraphQL
    [[AI_BOT]]: GraphQL is a dictionary that contains a name, a method, a request_body and a response_body
    [[USER]]: What's the attribute of State_Action?
    [[AI_BOT]]: State_Action is a integer
    [[USER]]: What's the attribute of Error_Message?
    [[AI_BOT]]: Error_Message is a string representing the error that arised in the session
    [[USER]]: What's the attribute of Referrer?
    [[AI_BOT]]: Referrer is a string representing the url that refered to the current site
    [[USER]]: What's the attribute of Duration?
    [[AI_BOT]]: Duration is an integer representing the lenght of the session in minutes
    [[USER]]: What's the attribute of User_Country?
    [[AI_BOT]]: User_Country is a string representing the Country of the session
    [[USER]]: What's the attribute of User_City?
    [[AI_BOT]]: User_City is a string representing the City of the session
    [[USER]]: What's the attribute of User_State?
    [[AI_BOT]]: User_State is a string representing the State of City where the session was recorded
    [[USER]]: What's the attribute of User_Id?
    [[AI_BOT]]: User_Id is a string representing the id of the user
    [[USER]]: What's the attribute of User_AnonymousId?
    [[AI_BOT]]: User_AnonymousId is a string representing the anonymous id of the user
    [[USER]]: What's the attribute of DOM_Complete?
    [[AI_BOT]]: DOM_Complete is a tuple (integer, string) representing the time to render the url and the url string
    [[USER]]: What's the attribute of Largest_Contentful_Paint?
    [[AI_BOT]]: Largest_Contentful_Paint is a tuple (integer, string) representing the time to load the heaviest content and the url string
    [[USER]]: What's the attribute of
    [[AI_BOT]]: Time_to_First_Byte is a tuple (integer, string) representing the time to get the first response byte from url and the url string
    [[USER]]: What's the attribute of Avg_CPU_Load?
    [[AI_BOT]]: Avg_CPU_Load is a tuple (integer, string) representing the porcentage of average cpu load in the url and the url string
    [[USER]]: What's the attribute of Avg_Memory_Usage?
    [[AI_BOT]]: Avg_Memory_Usage is a tuple (integer, string) representing the porcentage of average memory usage in the url and the url string
    [[USER]]: What's the attribute of Failed_Request?
    [[AI_BOT]]: Failed_Request is a string representing an url that had a Failed Request event
    [[USER]]: What's the attribute of Plan?
    [[AI_BOT]]: Plan is a string that could be 'pay_as_you_go', 'trial', 'free', 'enterprise'
    [[USER]]: Can you translate the following text into SQL query: {user_question}
    [[AI_BOT]]:
    """
    
    search_context_v3 = """We have a SQL table called sessions that contains the columns: Click, Text_Input, Visited_URL, Custom_Events, Network_Request->url, Network_Request->status_code, Network_Request->method, Network_Request->duration, GraphQL->name, GraphQL->method, GraphQL->request_body, GraphQL->response_body, State_Action, Error_Message, Issue, User_OS, User_Browser, User_Device, Platform, Version_ID, Referrer, Duration, User_Country, User_City, User_State, User_Id, User_Anonymous_Id, DOM_Complete->time_to_render, DOM_Complete->url, Larges_Contentful_Paint->time_to_load, Larges_Contentful_Paint->url, Time_to_First_Byte->time_to_load, Time_to_First_Byte->url, Avg_CPU_Load->percentage, Avg_CPU_Load->url, Avg_Memory_Usage->percentage, Avg_Memory_Usage->url, Failed_Request->name and Plan.
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
    [[USER]]: What's the attribute of userId?
    [[AI_BOT]]: userId is a string representing the id of the user
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
    
    search_context_v4 = """We have a database working with GraphQL, the type system is the following:
        type Click (name: String)
        type Text_Input (value: String)
        type Visited_URL (url: String)
        type Custom_Events (name: String)
        type Network Request (url: String, status_code: Int, method: String, duration: Int)
        type GraphQL (name: String, method: String, request_body: String, response_body: String)
        type State_Action (value: Int)
        type Error_Message (name: String)
        type Issue (name: String)
        type User_OS (name: String)
        type User_Browser (name: String)
        type User_Device (name: String)
        type Platform (name: String)
        type Version_ID (name: String)
        type Referrer (url: String)
        type Duration (value: Int)
        type User_Country (name: String)
        type User_City (name: String)
        type User_State (name: String)
        type User_Id (name: String)
        type User_Anonymous_Id (name: String)
        type DOM_Complete (time_to_render: Int, url: String)
        type Largest_Contentful_Paint (time_to_load: Int, url: String)
        type Time_to_First_Byte (time_to_load: Int, url: String)
        type Avg_Memory_Usage (percentage: Int, url: String)
        type Avg_Memory_Usage (percentage: Int, url: String)
        type Failed_Request (name: String)
        type Plan (name: String)
        [[USER]]: Get all session from India which has 5 minutes length
        [[AI_BOT]]: ```[
        (
            "value": [],
            "type": "User_Country",
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
                    "type": "Avg_Memory_Usage",
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

class ChartPrompt:
    chart_context_v1 = """We have a SQL table called sessions that contains the columns: Click, Text_Input, Visited_URL, Custom_Events, Network_Request->url, Network_Request->status_code, Network_Request->method, Network_Request->duration, GraphQL->name, GraphQL->method, GraphQL->request_body, GraphQL->response_body, State_Action, Error_Message, Issue, User_OS, User_Browser, User_Device, Platform, Version_ID, Referrer, Duration, User_Country, User_City, User_State, User_Id, User_Anonymous_Id, DOM_Complete->time_to_render, DOM_Complete->url, Larges_Contentful_Paint->time_to_load, Larges_Contentful_Paint->url, Time_to_First_Byte->time_to_load, Time_to_First_Byte->url, Avg_CPU_Load->percentage, Avg_CPU_Load->url, Avg_Memory_Usage->percentage, Avg_Memory_Usage->url, Failed_Request->name and Plan.
    [[USER]]: What is the attribute of the Click column?
    [[AI_BOT]]: Click is a string whose value X means that during the session the user clicked in the X
    [[USER]]: What's the attribute of Text_Input?
    [[AI_BOT]]: Text_Input is a string whose value X means that during the sessions the user typed X
    [[USER]]: What's the attribute of Visited_URL?
    [[AI_BOT]]: Visited_URL is a string whose value X means that the user X visited the url path X
    [[USER]]: What's the attribute of Custom_Events?
    [[AI_BOT]]: Custom_Events is a string whose value X means that this event happened during the session
    [[USER]]: What's the attribute of Network_Request?
    [[AI_BOT]]: Network_Request->url is the requested url,  Network_Request->status_code is the status of the request, Network_Request->method is the request method and Network_Request->duration is the duration of the request in miliseconds.
    [[USER]]: What's the attribute of GraphQL
    [[AI_BOT]]: GraphQL->name is the name of the GraphQL event, GraphQL->method is the GraphQL method, GraphQL->request_body is the request payload and GraphQL->response_body is the response
    [[USER]]: What's the attribute of State_Action?
    [[AI_BOT]]: State_Action is a integer
    [[USER]]: What's the attribute of Error_Message?
    [[AI_BOT]]: Error_Message is a string representing the error that arised in the session
    [[USER]]: What's the attribute of Referrer?
    [[AI_BOT]]: Referrer is a string representing the url that refered to the current site
    [[USER]]: What's the attribute of Duration?
    [[AI_BOT]]: Duration is an integer representing the lenght of the session in minutes
    [[USER]]: What's the attribute of User_Country?
    [[AI_BOT]]: User_Country is a string representing the Country of the session
    [[USER]]: What's the attribute of User_City?
    [[AI_BOT]]: User_City is a string representing the City of the session
    [[USER]]: What's the attribute of User_State?
    [[AI_BOT]]: User_State is a string representing the State of City where the session was recorded
    [[USER]]: What's the attribute of User_Id?
    [[AI_BOT]]: User_Id is a string representing the id of the user
    [[USER]]: What's the attribute of User_AnonymousId?
    [[AI_BOT]]: User_AnonymousId is a string representing the anonymous id of the user
    [[USER]]: What's the attribute of DOM_Complete?
    [[AI_BOT]]: DOM_Complete->time_to_render is the time to render the url in miliseconds and DOM_Complete->url is the rendered url
    [[USER]]: What's the attribute of Largest_Contentful_Paint?
    [[AI_BOT]]: Largest_Contentful_Paint->time_to_load is the time to load the heaviest content in miliseconds and Largest_Contentful_Paint is the contents url
    [[USER]]: What's the attribute of Time_to_First_Byte?
    [[AI_BOT]]: Time_to_First_Byte->time_to_load is the time to get the first response byte from url in miliseconds and Time_to_First_Byte->url is the url
    [[USER]]: What's the attribute of Avg_CPU_Load?
    [[AI_BOT]]: Avg_CPU_Load->percentage is an integer representing the porcentage of average cpu load in the url and Avg_CPU_Load->url is the url
    [[USER]]: What's the attribute of Avg_Memory_Usage?
    [[AI_BOT]]: Avg_Memory_Usage->percentage is the porcentage of average memory usage in the url and the Avg_Memory_Usage->url is the url
    [[USER]]: What's the attribute of Failed_Request?
    [[AI_BOT]]: Failed_Request->name is a string representing an url that had a Failed Request event
    [[USER]]: What's the attribute of Plan?
    [[AI_BOT]]: Plan is a string that could be 'pay_as_you_go', 'trial', 'free', 'enterprise'
    [[USER]]: Can you translate the following text into SQL query: {user_question}
    [[AI_BOT]]:"""
    
    chart_context_v2 = """We have the following charts types
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
    type Text_Input {value: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    type Visited_URL {location: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    type Custom_Events {eventName: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    type Network_Request {location: String, status_code: Integer, method: String, duration: Integer, eventsOrder: EventsOrderType}, operator: OperatorType}
    type GraphQL {name: String, method: String, request_body: String, response_body: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    type State_Action {value: Integer, eventsOrder: EventsOrderType}, operator: OperatorType}
    type Error_Message {msg: String, eventsOrder: EventsOrderType}, operator: OperatorType}
    
    Filters are one of these types:
    type Referrer {location: String, operator: OperatorType}
    type Duration {sessionDuration: Integer, operator: OperatorType}
    type User_Country {name: String, operator: OperatorType}
    type User_City {name: String, operator: OperatorType}
    type User_State {name: String, operator: OperatorType}
    type User_id {name: String, operator: OperatorType}
    type User_Anonymousid {name: String, operator: OperatorType}
    type DOM_Complete {time_to_render: Integer, location: String, operator: OperatorType}
    type Largest_Contentful_Pain {time_to_load: Integer, location: String, operator: OperatorType}
    type Time_to_First_Byte {time_for_first_byte: Integer, location: String, operator: OperatorType}
    type Avg_CPU_Load {percentage: Integer, location: String, operator: OperatorType}
    type Avg_Memory_Usage {percentage: Integer, location: String, operator: OperatorType}
    type Failed_Request {location: String, operator: OperatorType}
    type Plan {name: String, operator: OperatorType}
    
    The TimeRangeType can be one of these possible values: '24 hours', '7 days', '30 days'
    The EventsOrderType can be one of the following values: 'AND', 'OR', 'THEN'
    The OperatorType can be one of the following values: 'is', 'is any', 'is not', 'starts with', 'ends with', 'contains', 'not contains'
    The TableTypes can be one of these possible values: 'UsersTable', 'SessionsTable', 'JSErrors', 'Issues', 'Browser', 'Devices', 'Countries', 'URLs'
    The ErrorTypes can be one of these possible values: 'Errors by origin', 'errors per domain', 'errors by type', 'calls with error', 'top4xx domains', 'top5xx domains', 'Impacted sessions by JS errors'
    The PerformanceTypes can be one of these possible values: 'CPU_load', 'Crashes', 'frame_rate', 'DOM_building_time', 'Memory Consumption', 'Page response time', 'Page response time distribution', 'Resources vs visuality complete', 'Sessions per browser', 'Slowest domain', 'Speed index by location', 'time to render', 'Sessions impacted by slow pages'
    The ResourceType can be one of these possible values: 'Breakdown of loaded resources', 'Missing resources', 'Resource Type vs Response End', 'Resource fetch time', 'Slowest resources'
    The VitalsType can be one of these possible values: 'CPU load', 'frame rate', 'DOM Content loaded', 'DOM Content loaded start', 'DOM_build_time', 'First Meaningful Paint', 'First Paint', 'Image load time', 'Page load time', 'Page response time', 'Request load time', 'Response time', 'Session duration', 'Time til first byte', 'Time to be interactive', 'time to render', 'JS heap size', 'Visited pages', 'Captures requests', 'Captures Sessions'
    The InsightTypes is a list of values that can be: 'Resources', 'Network Request', 'Click Rage', 'JS Errors'
    
    [[USER]]: I want to see how many users are entering and leaving in the following funnel /home then /product then /product/buy
    [[AI_BOT]]: ```{
        'type': 'Funnel',
        'filters': [],
        'events': [
            {
                'type': 'Visited_URL',
                'location': '/home',
                'operator': 'is',
                'eventsOrder': 'THEN'
            },
            {
                'type': 'Visited_URL',
                'location': '/product',
                'operator': 'is',
                'eventsOrder': 'THEN'
            },
            {
                'type': 'Visited_URL',
                'location': '/product/buy',
                'operator': 'is',
                'eventsOrder': 'THEN'
            },
        ]
        'value': null,
        'timeRange': '7 days'
    }```
    [[USER]]: Show me where people are clicking the most in the location that contains /product over the past month
    [[AI_BOT]]:```{
        'type': 'ClickMap',
        'filters': [
            {
                'type': 'Visited_URL',
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
    

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


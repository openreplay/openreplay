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

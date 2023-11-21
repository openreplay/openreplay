# api

API v2 (uvicorn)

The API service is responsible for handling request from the frontend 
where customers can access features of openreplay. The users of the
that frontend are managers, and developpers are openreplay customers.

End-users' frontends, that is customer of openreplay customer, send 
data openreplay backend that is written in Go.

The API communicate with several services including the database PostgreSQL,
and in the entreprise edition ClickHouse.

## Glossary

- API service: the application of the code in this directory;
- Frontend: the ReactJS application that communicate with API;
- Client: most of the time a synonym of frontend; it may be another kind of 
  client authenticated with API service;
- Customer: the users of the frontend;
- End-users: the users of the frontend of openreplay customers;
- Backend: the code that process the data coming from the frontends used by end-users;*

## Getting started

```sh
$ ./venv
% make init
% make serve
```

## Basics

### HTTP/1.1 text

#### Request

```http
GET /folder/object-type/unique-identifier/complement HTTP/1.1
Header-One: Header Value One
Header-Two: Header Value Two

{"hello": "world"}
```

#### Response

```http
HTTP/1.1 200 OK
Another-Header-One: Another Header Value One

{"status": "ok"}
```

### uvicorn

The API service is built on top of `uvicorn` HTTP server. We use `uvicorn`
single entrypoint a function, that receive three ardiccguments:

- `scope`, a dictionary representing the HTTP made by the frontend;
- `receive()`, a function that lazily read the body of an HTTP request;
- `send(dict)`, a function to reply to the user. `dict` follow a precise 
  protocol documented in Python's ASGI standard specification. It is not 
  useful to know the details for most use-cases such as JSON over HTTP 
  response.

Ninety-nine percent of the time:

#. The client will send an HTTP request with a JSON body that is smaller 
   than one 1MB, that is smaller than memory.

#. The HTTP request is dispatched based on the path component of the HTTP
   request, that from the above HTTP text request `/folder/object-type/...`.

   Note: Path patterns should build a well formed and nice tree: the root 
   unfold into a couple of nodes, then each child unfold into more... taking 
   into account type casting such as integer.

   Hence the core or uvicorn `scope` handler will match HTTP path using 
   placehoders as known as routes.

#. A route is identified with a HTTP method, a path pattern, and optionally
   a pydantic Schema;

#. A route should explicitly do three types of validations:

   #. Container validation e.g. the body is propery JSON, CSV, XML... This is
      most of the time done using a parser: if the parser succeed, then it is
      the good container.

   #. Schema validation e.g. using pydantic, or JSON Schema;

   #. Shallow validation e.g. password, and confirmation match, password is strong 
      enough, the token is signed using the expected signature. Any validation
      that does not involve network, or disk io falls into that category.

   #. Deep validation e.g. while registring a new user, the e-mail must be unique.
    
      Note: sometime database transaction must span deep validation, and create, 
      update, or delete.
   
   In case of validation error, the expected error code is 400 aka. bad request.

#. The Request processing per-se; that may include one or more disk, or network io.
   Zero or more explicit database transactions may be necessary.

#. Response generation

### orpy

Like described above, most requests look alike. Hence there is a couple of helpers
to make it obvious, while a little boilerplate-ish in some cases, it handles 99% of
the cases, and there is room for expanding without hurting usability.

A route in orpy looks like the following:

```
@route("GET", "stats", "path", _, "review")
def view_get_stats_path_review(method, stats, path, uid, review):
    # method, stats, path, uid

# Message Object Binary Schema and Code Generator from Templates


To generate all necessary files for the project:

```sh
ruby run.rb

```

In order generated .go file to fit the go formatting style:
```sh
gofmt -w ../backend/pkg/messages/messages.go

```
(Otherwise there will be changes in stage)

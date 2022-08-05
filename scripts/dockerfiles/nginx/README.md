## Nginx read urls from env

We're using openresty because of native lua support.

1. To access the env variable using `os.getenv("MY_ENV")` we need to define `env MY_ENV` in nginx.conf

2. use ` set_by_lua_block $api_endpoint { return os.getenv("MY_ENV") }` in server directive of nginx.

Ref:
1. Nginx directives: https://openresty-reference.readthedocs.io/en/latest/Directives/#set_by_lua_block
2. env variable definition: 
  1. https://github.com/openresty/lua-nginx-module#system-environment-variable-support
  2. https://nginx.org/en/docs/ngx_core_module.html#env

## Run the app

```
docker run -v ${PWD}/nginx.conf:/usr/local/openresty/nginx/conf/nginx.conf \
-v ${PWD}/location.list:/etc/nginx/conf.d/location.list --rm -it \
-e FRONTEND_ENDPOINT="http://10.0.0.55:8000" -e API_ENDPOINT="http://10.0.0.55:9000" \
-p 80:8080 -p 9145:9145 local/nginx
```


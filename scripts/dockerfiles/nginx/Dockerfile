# Ability to add sticky sessions using any parameters
FROM openresty/openresty:buster as builder
workdir /work
ADD https://github.com/openresty/lua-resty-balancer/archive/refs/heads/master.tar.gz .
RUN apt update && \
    apt install gcc make -y && \
    tar -xf master.tar.gz && \
    cd lua-resty-balancer-master && \
    make


FROM openresty/openresty:buster

# Adding prometheus monitoring support
ADD https://raw.githubusercontent.com/knyar/nginx-lua-prometheus/master/prometheus.lua /usr/local/openresty/lualib/
ADD https://raw.githubusercontent.com/knyar/nginx-lua-prometheus/master/prometheus_keys.lua /usr/local/openresty/lualib/
ADD https://raw.githubusercontent.com/knyar/nginx-lua-prometheus/master/prometheus_resty_counter.lua /usr/local/openresty/lualib/
COPY --from=builder /work/lua-resty-balancer-master/*.so /usr/local/openresty/lualib/lua-resty-chash/
COPY --from=builder /work/lua-resty-balancer-master/lib /usr/local/openresty/lualib/lua-resty-chash/lib/

RUN chmod 0644 /usr/local/openresty/lualib/*.lua

# Enabling monitoring on port 9145
# Warning: don't expose this port to public network
COPY nginx.conf /usr/local/openresty${RESTY_DEB_FLAVOR}/nginx/conf/nginx.conf
RUN chmod 0644 /usr/local/openresty${RESTY_DEB_FLAVOR}/nginx/conf/nginx.conf 

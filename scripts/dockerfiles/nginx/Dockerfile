FROM openresty/openresty:1.21.4.1-alpine

# Adding prometheus monitoring support
ADD https://raw.githubusercontent.com/knyar/nginx-lua-prometheus/master/prometheus.lua /usr/local/openresty/lualib/
ADD https://raw.githubusercontent.com/knyar/nginx-lua-prometheus/master/prometheus_keys.lua /usr/local/openresty/lualib/
ADD https://raw.githubusercontent.com/knyar/nginx-lua-prometheus/master/prometheus_resty_counter.lua /usr/local/openresty/lualib/
RUN chmod 0644 /usr/local/openresty/lualib/*.lua

# Enabling monitoring on port 9145
# Warning: don't expose this port to public network
COPY nginx.conf /usr/local/openresty${RESTY_DEB_FLAVOR}/nginx/conf/nginx.conf
COPY compression.conf /etc/nginx/conf.d/compression.conf
COPY location.list /etc/nginx/conf.d/location.list
RUN chmod 0644 /usr/local/openresty${RESTY_DEB_FLAVOR}/nginx/conf/nginx.conf 

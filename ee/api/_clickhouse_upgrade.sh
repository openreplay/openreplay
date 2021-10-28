sudo yum update
sudo yum install yum-utils
sudo rpm --import https://repo.clickhouse.com/CLICKHOUSE-KEY.GPG
sudo yum-config-manager --add-repo https://repo.clickhouse.com/rpm/stable/x86_64
sudo yum update
sudo service clickhouse-server restart


#later mus use in clickhouse-client:
#SET allow_experimental_window_functions = 1;
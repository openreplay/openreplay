# Java Key Stores

You can copy here your Java Key Stores (JKS) files so a secret is created including them. Remember to use a truststore (`kafka.truststore.jks`) and one keystore (`kafka.keystore.jks`) per Kafka broker you have in the cluster. For instance, if you have 3 brokers you need to copy here the following files:

- kafka.truststore.jks
- kafka-0.keystore.jks
- kafka-1.keystore.jks
- kafka-2.keystore.jks

Find more info in [this section](https://github.com/bitnami/charts/tree/master/bitnami/kafka#enable-security-for-kafka-and-zookeeper) of the README.md file.

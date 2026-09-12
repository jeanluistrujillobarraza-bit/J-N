package com.jyn.store.config;

import org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class MongoConfig {

    @Bean
    public MongoClientSettingsBuilderCustomizer mongoClientSettingsCustomizer() {
        return builder -> {
            builder.applyToSslSettings(ssl -> ssl.enabled(true));
            builder.applyToSocketSettings(socket -> {
                socket.connectTimeout(5, TimeUnit.SECONDS);
                socket.readTimeout(5, TimeUnit.SECONDS);
            });
            builder.applyToClusterSettings(cluster -> {
                cluster.serverSelectionTimeout(5, TimeUnit.SECONDS);
            });
        };
    }
}

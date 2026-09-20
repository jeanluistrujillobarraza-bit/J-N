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
            builder.applyToSocketSettings(socket -> {
                socket.connectTimeout(10, TimeUnit.SECONDS);
                socket.readTimeout(30, TimeUnit.SECONDS);
            });
            builder.applyToClusterSettings(cluster -> {
                cluster.serverSelectionTimeout(10, TimeUnit.SECONDS);
            });
        };
    }
}

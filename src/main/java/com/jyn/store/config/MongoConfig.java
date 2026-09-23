package com.jyn.store.config;

import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;

import java.util.concurrent.TimeUnit;

@Configuration
public class MongoConfig {

    @Value("${spring.data.mongodb.uri:mongodb://localhost:27017/jyn_store}")
    private String mongoUri;

    @Value("${spring.data.mongodb.database:jyn_store}")
    private String defaultDatabaseName;

    @Bean
    public MongoDatabaseFactory mongoDatabaseFactory(MongoClient mongoClient) {
        String dbName = defaultDatabaseName;
        try {
            if (mongoUri != null && !mongoUri.trim().isEmpty()) {
                ConnectionString connectionString = new ConnectionString(mongoUri);
                if (connectionString.getDatabase() != null && !connectionString.getDatabase().trim().isEmpty()) {
                    dbName = connectionString.getDatabase().trim();
                }
            }
        } catch (Exception ignored) {}

        if (dbName == null || dbName.trim().isEmpty()) {
            dbName = "jyn_store";
        }

        return new SimpleMongoClientDatabaseFactory(mongoClient, dbName);
    }

    @Bean
    public MongoClientSettingsBuilderCustomizer mongoClientSettingsCustomizer() {
        return builder -> {
            builder.applyToSocketSettings(socket -> {
                socket.connectTimeout(20, TimeUnit.SECONDS);
                socket.readTimeout(60, TimeUnit.SECONDS);
            });
            builder.applyToClusterSettings(cluster -> {
                cluster.serverSelectionTimeout(20, TimeUnit.SECONDS);
            });
        };
    }
}


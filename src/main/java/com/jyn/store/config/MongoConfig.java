package com.jyn.store.config;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;

import java.util.concurrent.TimeUnit;

@Configuration
public class MongoConfig {

    @Value("${spring.data.mongodb.uri:mongodb://localhost:27017/jyn_store}")
    private String mongoUri;

    @Value("${spring.data.mongodb.database:jyn_store}")
    private String defaultDatabaseName;

    private String getEffectiveDatabaseName() {
        String dbName = null;
        try {
            if (mongoUri != null && !mongoUri.trim().isEmpty()) {
                ConnectionString cs = new ConnectionString(mongoUri.trim());
                dbName = cs.getDatabase();
            }
        } catch (Exception ignored) {}

        if (dbName == null || dbName.trim().isEmpty()) {
            dbName = (defaultDatabaseName != null && !defaultDatabaseName.trim().isEmpty()) 
                    ? defaultDatabaseName.trim() 
                    : "jyn_store";
        }
        return dbName;
    }

    @Bean
    @Primary
    public MongoClient mongoClient() {
        ConnectionString connectionString = new ConnectionString(mongoUri != null && !mongoUri.trim().isEmpty() ? mongoUri.trim() : "mongodb://localhost:27017/jyn_store");
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(connectionString)
                .applyToSocketSettings(socket -> {
                    socket.connectTimeout(20, TimeUnit.SECONDS);
                    socket.readTimeout(60, TimeUnit.SECONDS);
                })
                .applyToClusterSettings(cluster -> {
                    cluster.serverSelectionTimeout(20, TimeUnit.SECONDS);
                })
                .build();
        return MongoClients.create(settings);
    }

    @Bean
    @Primary
    public MongoDatabaseFactory mongoDatabaseFactory(MongoClient mongoClient) {
        return new SimpleMongoClientDatabaseFactory(mongoClient, getEffectiveDatabaseName());
    }

    @Bean
    @Primary
    public MongoTemplate mongoTemplate(MongoDatabaseFactory mongoDatabaseFactory) {
        return new MongoTemplate(mongoDatabaseFactory);
    }
}


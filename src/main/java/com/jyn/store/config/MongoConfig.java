package com.jyn.store.config;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.net.ssl.SSLContext;
import java.util.concurrent.TimeUnit;

@Configuration
public class MongoConfig {

    @Value("${spring.data.mongodb.uri}")
    private String mongoUri;

    @Bean
    public MongoClient mongoClient() {
        ConnectionString connectionString = new ConnectionString(mongoUri);

        MongoClientSettings.Builder settingsBuilder = MongoClientSettings.builder()
                .applyConnectionString(connectionString)
                .applyToSocketSettings(builder -> {
                    builder.connectTimeout(20, TimeUnit.SECONDS);
                    builder.readTimeout(20, TimeUnit.SECONDS);
                })
                .applyToClusterSettings(builder -> {
                    builder.serverSelectionTimeout(20, TimeUnit.SECONDS);
                });

        if (mongoUri.startsWith("mongodb+srv://") || mongoUri.contains("ssl=true")) {
            try {
                SSLContext sslContext = SSLContext.getInstance("TLSv1.2");
                sslContext.init(null, null, null);
                settingsBuilder.applyToSslSettings(builder -> {
                    builder.enabled(true);
                    builder.context(sslContext);
                });
            } catch (Exception ignored) {
            }
        }

        return MongoClients.create(settingsBuilder.build());
    }
}

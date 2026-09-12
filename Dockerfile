# Stage 1: Build application with Maven and Amazon Corretto 21
FROM maven:3.9.6-amazoncorretto-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime with Amazon Corretto 21 (Native AWS/Atlas TLS compatibility)
FROM amazoncorretto:21
WORKDIR /app
COPY --from=build /app/target/store-0.0.1-SNAPSHOT.jar app.jar
ENV JAVA_TOOL_OPTIONS="-Djdk.tls.client.protocols=TLSv1.2 -Dhttps.protocols=TLSv1.2 -Djsse.enableSNIExtension=true"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

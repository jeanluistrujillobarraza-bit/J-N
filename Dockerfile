# Stage 1: Build application with Maven and Amazon Corretto 21
FROM maven:3.9.6-amazoncorretto-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime with Amazon Corretto 21 (Native AWS/Atlas TLS compatibility)
FROM amazoncorretto:21
WORKDIR /app
RUN mkdir -p /app/uploads
COPY --from=build /app/target/store-0.0.1-SNAPSHOT.jar app.jar
COPY uploads/ /app/uploads/
ENV JAVA_TOOL_OPTIONS="-Djdk.tls.client.protocols=TLSv1.2 -Dhttps.protocols=TLSv1.2 -Djsse.enableSNIExtension=true -Djava.net.preferIPv4Stack=true -Dsun.net.inetaddr.ttl=60"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

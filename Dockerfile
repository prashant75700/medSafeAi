# ── Stage 1: Build ───────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
# Download dependencies first for layer caching
RUN apk add --no-cache maven && mvn dependency:go-offline -q
RUN mvn package -DskipTests -q

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /build/target/medsafe-*.jar app.jar

# Non-root user for security
RUN addgroup -S medsafe && adduser -S medsafe -G medsafe
USER medsafe

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=prod", "/app/app.jar"]

# =====================================================================
#  SavdoPRO License Server — multi-stage container build
#
#  Stage 1 (builder): full Maven + JDK 21 to compile the fat JAR.
#  Stage 2 (runtime): slim Alpine JRE 21 to actually run it.
#
#  Image size after both stages: ~200 MB (vs ~600 MB if we kept Maven).
#
#  Build:   docker build -t savdopro/license-server:latest .
#  Run dev: docker run --rm -p 9090:9090 savdopro/license-server:latest
#  Prod:    use docker-compose.yml — it pairs us with Postgres + sets envs.
# =====================================================================

# ---------- Stage 1: build the JAR ----------
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build

# Cache dependencies first — pom.xml changes far less often than source.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Now copy source and build. The final JAR lands at target/savdopro-license-server.jar
# (we set <finalName> in pom.xml so the path is predictable).
COPY src ./src
RUN mvn -B -q package -DskipTests

# ---------- Stage 2: runtime ----------
FROM eclipse-temurin:21-jre-alpine
LABEL org.opencontainers.image.title="SavdoPRO License Server"
LABEL org.opencontainers.image.source="https://github.com/sarvar/savdopro"

# Drop privileges — never run Spring as root inside a container.
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=builder /build/target/savdopro-license-server.jar app.jar
RUN chown -R app:app /app
USER app

# The server binds to 0.0.0.0:9090 (see application.properties). Document it
# here so `docker run` users know which port to publish.
EXPOSE 9090

# Health probe — used by docker-compose's healthcheck and by orchestrators.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -qO- http://127.0.0.1:9090/api/health || exit 1

# JVM tuning for a small VPS (1 GB RAM). MaxRAMPercentage tells the JVM to
# claim 75% of the container's memory limit instead of guessing.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

ENTRYPOINT ["java", "-jar", "/app/app.jar"]

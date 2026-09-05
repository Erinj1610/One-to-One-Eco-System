# Stage 1: Build standalone CadParser CLI for Linux x64
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS cad_builder
WORKDIR /src
COPY cad_parser/ cad_parser/
RUN dotnet publish cad_parser/CadParser.csproj -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true -o /out

# Stage 2: Python Backend
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

# Install LibreOffice and fonts for PDF rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    fonts-dejavu \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Copy compiled CadParser Linux binary from stage 1
RUN mkdir -p /app/bin
COPY --from=cad_builder /out/CadParser /app/bin/cad-parser-linux
RUN chmod +x /app/bin/cad-parser-linux

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

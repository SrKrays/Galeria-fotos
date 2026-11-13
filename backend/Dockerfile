# Imagen para Render (o cualquier servicio que corra Docker).
# Se construye desde la carpeta backend/:  docker build -t galeria-api .
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS compilar
WORKDIR /src
COPY GaleriaCarrizo.Api/GaleriaCarrizo.Api.csproj GaleriaCarrizo.Api/
RUN dotnet restore GaleriaCarrizo.Api
COPY GaleriaCarrizo.Api/ GaleriaCarrizo.Api/
RUN dotnet publish GaleriaCarrizo.Api -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=compilar /app .
# Render entrega el puerto en la variable PORT (10000 por defecto)
ENV ASPNETCORE_HTTP_PORTS=10000
EXPOSE 10000
ENTRYPOINT ["dotnet", "GaleriaCarrizo.Api.dll"]

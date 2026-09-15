# GeoServer Integration & Configuration Guide

This guide details the configuration of **GeoServer** to serve cadastral parcel layers directly from the authoritative Backend **PostgreSQL + PostGIS** database (`parcels` table in `bhusetu_db`).

> [!IMPORTANT]
> **Source of Truth Reminder**:
> GeoServer must connect to the authoritative Backend PostGIS database (`bhusetu_db`, table `public.parcels`).
> Do **NOT** use the deprecated `land_parcels.public.parcels` mock database or `PARCEL-001` ... `PARCEL-004` mock layers.

---

## 1. GeoServer Architecture & Metadata

- **Workspace**: `landgov`
- **Namespace URI**: `http://landgov.local`
- **Data Store**: `bhusetu_postgis` (PostGIS Database Store)
- **Published Layer**: `landgov:parcels`
- **Native Table**: `parcels`
- **Geometry Column**: `geometry`
- **Geometry Type**: `Polygon`
- **Native & Declared CRS**: `EPSG:4326` (WGS 84 geographic 2D)

---

## 2. OGC Service Endpoints

Once published, GeoServer exposes standard Open Geospatial Consortium (OGC) interfaces for consumption by the Web Frontend and GIS clients:

### 1. WMS (Web Map Service)
For raster tiles, bounding box rendering, and overview maps:
```
http://localhost:8080/geoserver/landgov/wms?service=WMS&version=1.1.1&request=GetMap&layers=landgov:parcels&bbox=75.80,30.85,75.95,30.95&width=800&height=600&srs=EPSG:4326&format=image/png
```

### 2. WFS (Web Feature Service)
For raw spatial feature querying and attribute filtering:
```
http://localhost:8080/geoserver/landgov/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=landgov:parcels
```

### 3. WFS GeoJSON Feed (Direct Frontend Consumption)
For direct consumption by Leaflet, OpenLayers, or Mapbox GL:
```
http://localhost:8080/geoserver/landgov/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=landgov:parcels&outputFormat=application/json
```

---

## 3. How Backend and Application Consume GIS Data

1. **Direct Backend API Gateway (`GET /api/map/parcels`)**:
   - The Backend connects to PostGIS via connection pooling and returns a serialized GeoJSON FeatureCollection directly from `ST_AsGeoJSON(geometry)`.
   - This ensures full API compliance even if GeoServer is undergoing maintenance.

2. **GeoServer High-Performance Vector / Tile Layer**:
   - When large cadastral maps (>10,000 parcels) are loaded, the frontend directly streams vector tiles or GeoJSON from GeoServer's WFS/WMS endpoints.
   - Spatial filters (e.g. `CQL_FILTER=ulpid='PB-LDH-0042'`) can be passed to GeoServer WFS queries for sub-second viewport clipping.

---

## 4. Manual Setup Guide (GeoServer Web UI)

Follow these steps in the GeoServer Administrative Web UI (`http://localhost:8080/geoserver/web`):

### Step 1: Create Workspace
1. Navigate to **Data** -> **Workspaces** -> **Add new workspace**.
2. **Name**: `landgov`
3. **Namespace URI**: `http://landgov.local`
4. Check **Default Workspace** (optional).
5. Click **Save**.

### Step 2: Add PostGIS Data Store
1. Navigate to **Data** -> **Stores** -> **Add new Store**.
2. Select **PostGIS - PostGIS Database**.
3. Configure connection parameters:
   - **Workspace**: `landgov`
   - **Data Store Name**: `bhusetu_postgis`
   - **Description**: `Authoritative Bhu-Setu PostgreSQL PostGIS parcel database`
   - **host**: `localhost` (or database container hostname)
   - **port**: `5432`
   - **database**: `bhusetu_db`
   - **schema**: `public`
   - **user**: *(your database username, e.g. postgres)*
   - **password**: *(your database password)*
   - **Estimated extends**: Checked
   - **Expose primary keys**: Checked
4. Click **Save**.

### Step 3: Publish the `parcels` Layer
1. In the **New Layer** chooser, click **Publish** next to `parcels`.
2. In the **Data** tab:
   - **Name**: `parcels`
   - **Title**: `Bhu-Setu Cadastral Land Parcels`
   - **Native CRS**: Verify `EPSG:4326` is detected automatically from PostGIS table metadata.
   - **Declared CRS**: `EPSG:4326`
   - **Bounding Boxes**: Click **Compute from data** and **Compute from native bounds**.
3. In the **Publishing** tab:
   - Set **Default Style** to `polygon` or custom cadastral parcel style.
4. Click **Save**.

---

## 5. Automated Setup via GeoServer REST API

If setting up GeoServer programmatically using curl (replace `<GEOSERVER_USER>`, `<GEOSERVER_PASS>`, `<DB_USER>`, and `<DB_PASS>` with appropriate local environment variables):

```bash
# 1. Create landgov workspace
curl -v -u <GEOSERVER_USER>:<GEOSERVER_PASS> -X POST \
  -H "Content-type: text/xml" \
  -d "<workspace><name>landgov</name></workspace>" \
  http://localhost:8080/geoserver/rest/workspaces

# 2. Create PostGIS DataStore pointing to bhusetu_db
curl -v -u <GEOSERVER_USER>:<GEOSERVER_PASS> -X POST \
  -H "Content-type: text/xml" \
  -d "<dataStore>
        <name>bhusetu_postgis</name>
        <connectionParameters>
          <host>localhost</host>
          <port>5432</port>
          <database>bhusetu_db</database>
          <schema>public</schema>
          <user><DB_USER></user>
          <passwd><DB_PASS></passwd>
          <dbtype>postgis</dbtype>
        </connectionParameters>
      </dataStore>" \
  http://localhost:8080/geoserver/rest/workspaces/landgov/datastores

# 3. Publish parcels table layer
curl -v -u <GEOSERVER_USER>:<GEOSERVER_PASS> -X POST \
  -H "Content-type: text/xml" \
  -d "<featureType>
        <name>parcels</name>
        <nativeName>parcels</nativeName>
        <title>Bhu-Setu Cadastral Parcels</title>
        <srs>EPSG:4326</srs>
      </featureType>" \
  http://localhost:8080/geoserver/rest/workspaces/landgov/datastores/bhusetu_postgis/featuretypes
```

---

## 6. Verification of Published Layer

Verify layer publication by requesting GeoJSON features:

```bash
curl -s "http://localhost:8080/geoserver/landgov/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=landgov:parcels&outputFormat=application/json"
```

Expected output:
- Returns a standard GeoJSON FeatureCollection containing `PB-LDH-0042`, `PB-LDH-0043`, `PB-LDH-0044`.
- Features have `geometry.type === 'Polygon'` and properties including `ulpid`.

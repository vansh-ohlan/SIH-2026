# GeoServer Configuration

Workspace: landgov
Namespace: http://landgov.local

PostGIS Database:
- Database: land_parcels
- Host: localhost
- Port: 5432
- Schema: public

Published Layer:
- Layer: landgov:parcels
- Table: public.parcels
- Geometry: geom
- CRS: EPSG:4326

Services:

WMS:
http://localhost:8080/geoserver/landgov/wms

WFS:
http://localhost:8080/geoserver/landgov/wfs

GeoJSON:
http://localhost:8080/geoserver/landgov/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=landgov:parcels&outputFormat=application/json

Local startup:
cd ~/Downloads/geoserver-3.0.1-bin/bin
./startup.sh

GeoServer:
http://localhost:8080/geoserver

GIS pipeline:
QGIS -> PostGIS -> GeoServer -> WMS / WFS / GeoJSON

The landgov:parcels layer has been verified locally through WFS GeoJSON.

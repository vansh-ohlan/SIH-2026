# GIS Setup Guide (Mac) — PostGIS + GeoServer for SIH Land Governance Project

This walks through every step from a clean Mac to a working WMS/WFS endpoint serving parcel data.

---

## Part 1: Install Homebrew (skip if you already have it)

1. Open **Terminal** (Cmd+Space, type "Terminal", hit Enter).
2. Paste this and press Enter:
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. Enter your Mac password when prompted (typing is invisible — that's normal). Press Enter.
4. Wait for it to finish. At the end it may print 2 lines starting with `echo` — copy-paste those into Terminal and press Enter (this adds Homebrew to your PATH).
5. Verify: type `brew --version` and press Enter. You should see a version number.

---

## Part 2: Install PostgreSQL + PostGIS

1. In Terminal, run:
   ```
   brew install postgresql@16 postgis
   ```
2. Wait for install to finish (a few minutes).
3. Start the PostgreSQL service:
   ```
   brew services start postgresql@16
   ```
4. Add Postgres to your PATH so commands work directly:
   ```
   echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```
5. Verify it's running:
   ```
   psql postgres
   ```
   You should land at a `postgres=#` prompt. Type `\q` and Enter to exit.

---

## Part 3: Create your spatial database

1. In Terminal:
   ```
   createdb land_parcels
   ```
2. Connect to it:
   ```
   psql land_parcels
   ```
3. At the `land_parcels=#` prompt, enable PostGIS:
   ```sql
   CREATE EXTENSION postgis;
   ```
4. Confirm it worked:
   ```sql
   SELECT postgis_version();
   ```
   You should see a version string, not an error.
5. Type `\q` and Enter to exit.

---

## Part 4: Install QGIS (for viewing/creating parcel shapefiles)

1. Go to **https://qgis.org/download/** in your browser.
2. Click the **macOS** button.
3. Click the link for the latest stable `.dmg` installer (Long Term Release is safest).
4. Once downloaded, double-click the `.dmg` file in your Downloads folder.
5. Drag the **QGIS** icon into the **Applications** folder shown in the window that pops up.
6. Open **Applications** in Finder, find **QGIS**, double-click to launch.
7. If macOS blocks it ("unidentified developer"): go to **System Settings → Privacy & Security**, scroll down, click **Open Anyway** next to the QGIS warning, then confirm.

---

## Part 5: Get or create sample parcel data

**Option A — Download real sample data (faster):**
1. In your browser, go to **https://download.geofabrik.de/** or your state's GIS open-data portal.
2. Search for a small area's land-use/parcel shapefile or GeoJSON.
3. Download the `.zip`, then double-click to unzip it into a folder (e.g. `~/Downloads/parcels`).

**Option B — Hand-draw mock parcels in QGIS (more control, good for a demo):**
1. Open QGIS.
2. Go to **Layer → Create Layer → New Shapefile Layer**.
3. Set **File name** (e.g. `mock_parcels.shp`), **Geometry type** = Polygon.
4. Under **New Field**, add a field named `ulpid`, type Text, click the green **+** to add it, then click **OK**.
5. In the top toolbar, click the pencil icon (**Toggle Editing**) on your new layer (select it in the Layers panel first).
6. Click **Add Polygon Feature** (the icon with a polygon shape).
7. Click on the map canvas to place points forming a parcel boundary; right-click to finish the shape.
8. A form pops up asking for the `ulpid` value — type something like `PARCEL-001`, click **OK**.
9. Repeat steps 6–8 to draw a few more mock parcels (`PARCEL-002`, `PARCEL-003`...).
10. Click the pencil icon again to **stop editing** — click **Save** when prompted.

---

## Part 6: Load the shapefile into PostGIS

1. In QGIS, go to **Database → DB Manager**.
2. In the tree on the left, expand **PostGIS**, right-click it, choose **New Connection**.
3. Fill in:
   - Name: `land_parcels`
   - Host: `localhost`
   - Port: `5432`
   - Database: `land_parcels`
   - Leave username/password blank if you didn't set one (Mac default trusts local connections).
4. Click **OK**, then double-click the new connection to connect.
5. With the connection selected, click **Import Layer/File** (icon in the DB Manager toolbar).
6. Click the **...** button next to "Input", browse to your shapefile (from Part 5), select it.
7. Set **Output table** name, e.g. `parcels`.
8. Make sure **Source SRID** is set correctly (usually 4326 for lat/long — check your data's projection).
9. Click **OK**. Wait for "Import completed" message.
10. Verify: back in Terminal, run `psql land_parcels` then:
    ```sql
    SELECT ulpid, ST_AsText(geom) FROM parcels LIMIT 5;
    ```
    You should see rows with your parcel IDs and geometry.

---

## Part 7: Install and start GeoServer

1. Go to **https://geoserver.org/download/** in your browser.
2. Under "Stable", click **Platform Independent Binary** and download the `.zip`.
3. You'll also need **Java** — check if you have it: in Terminal, run `java -version`. If it errors, run:
   ```
   brew install openjdk@17
   echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```
4. Unzip the GeoServer download (double-click the `.zip` in Downloads) — this creates a folder like `geoserver-2.xx.x`.
5. Move that folder somewhere permanent, e.g. drag it into your home folder.
6. In Terminal, navigate into it and start it, e.g.:
   ```
   cd ~/geoserver-2.xx.x/bin
   sh startup.sh
   ```
7. Leave this Terminal window open (it's running the server). You'll see log output scrolling.
8. Open your browser and go to **http://localhost:8080/geoserver**.
9. Log in top-right: default username `admin`, password `geoserver`.

---

## Part 8: Connect GeoServer to PostGIS and publish your layer

1. In the GeoServer web UI, left sidebar, click **Workspaces → Add new workspace**.
   - Name: `landgov`, Namespace URI: `http://landgov.local` → **Submit**.
2. Left sidebar, click **Stores → Add new Store**.
3. Under Vector Data Sources, click **PostGIS**.
4. Fill in the form:
   - Workspace: `landgov`
   - Data Source Name: `parcels_store`
   - host: `localhost`
   - port: `5432`
   - database: `land_parcels`
   - schema: `public`
   - user: your Mac username (run `whoami` in Terminal if unsure)
   - Leave password blank if none was set.
5. Click **Save**. GeoServer will detect your `parcels` table — click **Publish** next to it.
6. On the "Edit Layer" screen:
   - Click **Compute from data** next to Bounding Boxes (Native and Lat/Lon).
   - Scroll down, click **Save**.
7. Test it: go to left sidebar **Layer Preview**, find `landgov:parcels`, click **OpenLayers** next to it — a map should open in a new tab showing your parcels.

---

## Part 9: Confirm your WMS/WFS endpoints work

- WMS capabilities: `http://localhost:8080/geoserver/landgov/wms?service=WMS&version=1.1.0&request=GetCapabilities`
- WFS capabilities: `http://localhost:8080/geoserver/landgov/wfs?service=WFS&version=1.0.0&request=GetCapabilities`

Paste each into your browser — if you get back XML listing `parcels`, you're done. Send these two URLs to your Backend Dev and frontend teammate — this is what they'll plug into their code.

---

## If something breaks
- **`psql: command not found`** → Part 2 step 4 didn't apply; re-run the `echo`/`source` lines.
- **GeoServer won't start** → check Java is installed (`java -version`); check port 8080 isn't already used by something else.
- **PostGIS store fails to connect in GeoServer** → double check the database name/user match exactly what you created in Part 3.

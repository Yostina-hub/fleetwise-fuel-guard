
## 8 Next-Gen Map Features

Already built: Predictive ETA, Time-Warp Playback, Geospatial Heatmap, Convoy Mode

### Remaining 8 features:

1. **Geofence Live Visualizer** — Render all geofence boundaries on the map with real-time entry/exit pulse animations and violation alerts
2. **Route Replay & Comparison** — Side-by-side or overlay comparison of actual driven route vs planned/optimal route for a trip
3. **Fuel Anomaly Detector** — Pinpoint suspicious fuel drops on the map with theft probability scoring and location markers
4. **Speed Corridor Overlay** — Visualize speed limit zones and highlight vehicles exceeding limits with color-coded corridors
5. **Vehicle Proximity Radar** — Real-time proximity detection between fleet vehicles with collision-risk warnings
6. **Driver Event Mapper** — Plot harsh braking, acceleration, and cornering events as interactive markers on the map
7. **Smart Dispatch Suggester** — AI-powered nearest-vehicle recommendations for new dispatch jobs based on real-time positions
8. **Fleet Pulse Dashboard** — Floating mini-dashboard overlay showing live fleet KPIs (online %, avg speed, total distance, idle count)

### Implementation approach:
- Each feature as a standalone component in `src/components/map/`
- Toggle buttons added to MapView toolbar
- Consistent UI pattern: floating panels with backdrop blur

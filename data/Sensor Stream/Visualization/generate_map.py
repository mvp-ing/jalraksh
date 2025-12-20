import pandas as pd
import folium
import os

def generate_map(file_path, output_file):
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    if 'latitude' not in df.columns or 'longitude' not in df.columns:
        print("Latitude/Longitude columns not found.")
        return

    # Drop rows with missing lat/lon and ensure numeric
    df_geo = df.dropna(subset=['latitude', 'longitude']).copy()
    df_geo['latitude'] = pd.to_numeric(df_geo['latitude'], errors='coerce')
    df_geo['longitude'] = pd.to_numeric(df_geo['longitude'], errors='coerce')
    df_geo = df_geo.dropna(subset=['latitude', 'longitude'])

    print(f"Stations with valid coordinates: {len(df_geo)}")

    if len(df_geo) == 0:
        print("No valid coordinates found.")
        return

    # Center map on average coordinates
    center_lat = df_geo['latitude'].mean()
    center_lon = df_geo['longitude'].mean()
    m = folium.Map(location=[center_lat, center_lon], zoom_start=5)

    for idx, row in df_geo.iterrows():
        popup_text = f"""
        <b>STN Code:</b> {row['STN code']}<br>
        <b>Location:</b> {row['Monitoring Location']}<br>
        <b>Type:</b> {row['Type Water Body']}<br>
        <b>State:</b> {row['State Name']}
        """
        folium.Marker(
            location=[row['latitude'], row['longitude']],
            popup=folium.Popup(popup_text, max_width=300),
            tooltip=str(row['Monitoring Location'])
        ).add_to(m)
    
    m.save(output_file)
    print(f"Map saved to {output_file}")

if __name__ == "__main__":
    input_csv = '/Users/manjunathanr/Documents/Personal/jalraksh/data/Sensor Stream/Indian_water_data.csv'
    output_html = '/Users/manjunathanr/.gemini/antigravity/brain/cbc0ca43-d236-41ab-9b4f-e3e510eef71b/station_map.html'
    generate_map(input_csv, output_html)

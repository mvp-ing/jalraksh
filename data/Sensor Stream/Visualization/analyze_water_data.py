import pandas as pd
import matplotlib.pyplot as plt
import sys

try:
    import folium
    HAS_FOLIUM = True
except ImportError:
    HAS_FOLIUM = False

def analyze_data(file_path):
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    # Count Monitoring Stations
    num_stations = df['STN code'].nunique()
    print(f"Number of Monitoring Stations: {num_stations}")

    # Check for latitude and longitude
    if 'latitude' not in df.columns or 'longitude' not in df.columns:
        print("Latitude/Longitude columns not found.")
        return

    # Drop rows with missing lat/lon
    df_geo = df.dropna(subset=['latitude', 'longitude'])
    print(f"Stations with valid coordinates: {len(df_geo)}")

    if HAS_FOLIUM:
        print("Generating interactive map using Folium...")
        # Center map on average coordinates
        center_lat = df_geo['latitude'].mean()
        center_lon = df_geo['longitude'].mean()
        m = folium.Map(location=[center_lat, center_lon], zoom_start=5)

        for idx, row in df_geo.iterrows():
            popup_text = f"STN: {row['STN code']}<br>Loc: {row['Monitoring Location']}<br>Type: {row['Type Water Body']}"
            folium.Marker(
                location=[row['latitude'], row['longitude']],
                popup=popup_text,
                tooltip=row['Monitoring Location']
            ).add_to(m)
        
        output_file = 'station_map.html'
        m.save(output_file)
        print(f"Map saved to {output_file}")
    else:
        print("Folium not found. Generating static map using Matplotlib...")
        plt.figure(figsize=(10, 8))
        plt.scatter(df_geo['longitude'], df_geo['latitude'], c='blue', alpha=0.6, edgecolors='k')
        plt.title('Monitoring Stations Distribution')
        plt.xlabel('Longitude')
        plt.ylabel('Latitude')
        plt.grid(True)
        
        for idx, row in df_geo.iterrows():
            plt.text(row['longitude'], row['latitude'], str(row['STN code']), fontsize=8, alpha=0.7)

        output_file = 'station_map.png'
        plt.savefig(output_file)
        print(f"Map saved to {output_file}")

if __name__ == "__main__":
    file_path = '/Users/manjunathanr/Documents/Personal/jalraksh/data/Sensor Stream/Indian_water_data.csv'
    analyze_data(file_path)

import pandas as pd
import numpy as np
import os
import random
from datetime import datetime, timedelta

def augment_data(input_file, output_file):
    print(f"Reading data from {input_file}...")
    try:
        df = pd.read_csv(input_file)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    augmented_rows = []
    
    # Parameters for augmentation
    start_date = datetime(2023, 1, 1)
    months = 24
    
    # Columns to simulate (using min/max averages as base)
    # Mapping: (Base Column Min, Base Column Max) -> Target Column Name
    param_map = {
        ('Temperature (C) - Min', 'Temperature (C) - Max'): 'Temperature (C)',
        ('Dissolved - Min', 'Dissolved - Max'): 'Dissolved Oxygen (mg/L)',
        ('pH - Min', 'pH - Max'): 'pH',
        ('Conductivity (¬µmho/cm) - Min', 'Conductivity (¬µmho/cm) - Max'): 'Conductivity (µmho/cm)',
        ('BOD (mg/L) - Min', 'BOD (mg/L) - Max'): 'BOD (mg/L)',
        ('NitrateN (mg/L) - Min', 'NitrateN (mg/L) - Max'): 'NitrateN (mg/L)',
        ('Fecal Coliform (MPN/100ml) - Min', 'Fecal Coliform (MPN/100ml) - Max'): 'Fecal Coliform (MPN/100ml)',
        ('Total Coliform (MPN/100ml) - Min', 'Total Coliform (MPN/100ml) - Max'): 'Total Coliform (MPN/100ml)'
    }

    unique_stations = df['STN code'].unique()
    print(f"Processing {len(unique_stations)} stations...")

    for stn_code in unique_stations:
        station_data = df[df['STN code'] == stn_code].iloc[0]
        
        # Determine if this station will have a temporal shift (50% chance)
        has_shift = random.choice([True, False])
        shift_direction = random.choice([1, -1]) if has_shift else 0
        
        for i in range(months):
            current_date = start_date + timedelta(days=i*30)
            
            new_row = {
                'STN code': stn_code,
                'Monitoring Location': station_data['Monitoring Location'],
                'Type Water Body': station_data['Type Water Body'],
                'State Name': station_data['State Name'],
                'Date': current_date.strftime('%Y-%m-%d'),
                'latitude': station_data['latitude'],
                'longitude': station_data['longitude']
            }
            
            # Simulate parameters
            for (col_min, col_max), target_col in param_map.items():
                val_min = pd.to_numeric(station_data.get(col_min), errors='coerce')
                val_max = pd.to_numeric(station_data.get(col_max), errors='coerce')
                
                if pd.isna(val_min) or pd.isna(val_max):
                    new_row[target_col] = None
                    continue
                
                base_val = (val_min + val_max) / 2
                
                # Add random noise (±5%)
                noise = base_val * 0.05 * random.uniform(-1, 1)
                
                # Add temporal shift if applicable (linear drift up to 20% over 24 months)
                drift = 0
                if has_shift:
                    drift = base_val * 0.20 * (i / months) * shift_direction
                
                final_val = base_val + noise + drift
                
                # Ensure non-negative values for physical parameters
                if final_val < 0:
                    final_val = 0
                    
                new_row[target_col] = round(final_val, 2)
            
            augmented_rows.append(new_row)

    augmented_df = pd.DataFrame(augmented_rows)
    
    # Save to output
    augmented_df.to_csv(output_file, index=False)
    print(f"Augmented data saved to {output_file}")
    print(f"Total rows generated: {len(augmented_df)}")

if __name__ == "__main__":
    input_csv = '/Users/manjunathanr/Documents/Personal/jalraksh/data/Sensor Stream/Indian_water_data.csv'
    output_csv = '/Users/manjunathanr/Documents/Personal/jalraksh/data/Sensor Stream/Indian_water_data_augmented.csv'
    augment_data(input_csv, output_csv)

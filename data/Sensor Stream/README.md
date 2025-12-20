This Folder contains the data from:
http://kaggle.com/datasets/rishabchitloor/indian-water-quality-data-2021-2023

The data is sourced from the Central Pollution Control Board (CPCB) of India, which is the national organization responsible for the prevention and control of water and air pollution. This dataset is a part of their ongoing efforts to monitor the health of India's water resources under the National Water Quality Monitoring Programme (NWMP).

We will be using this data as a baseline, and augmenting based on a logic on top of this, to develop the waterbodies over time.

## Data Augmentation Logic

To simulate temporal progression and create a richer dataset for analysis, we have augmented the original snapshot data. The augmentation logic, implemented in `augment_code/augment_water_data.py`, works as follows:

1.  **Temporal Expansion**: For each of the 168 monitoring stations, we generated a 24-month time series (Jan 2023 - Dec 2024).
2.  **Base Values**: The baseline for each parameter (e.g., Temperature, pH, DO) is derived from the average of the reported Min and Max values in the original dataset.
3.  **Random Noise**: A random noise factor of ±5% is added to every data point to simulate natural fluctuations.
4.  **Temporal Shift**: To mimic environmental changes or trends:
    - Approximately 50% of the stations are randomly selected to exhibit a "drift".
    - This drift is modeled as a linear trend, increasing or decreasing the parameter values by up to 20% over the 24-month period.
    - This allows us to test detection algorithms for both stable and changing water quality conditions.

The resulting augmented dataset is saved as `Indian_water_data_augmented.csv`.

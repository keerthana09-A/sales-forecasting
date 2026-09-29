CREATE TABLE stores (
    store_id INT PRIMARY KEY,
    type VARCHAR(10),
    size INT
);

CREATE TABLE inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT,
    dept_id INT,
    current_stock INT NOT NULL DEFAULT 0,
    lead_time_weeks INT DEFAULT 1,
    service_level_target FLOAT DEFAULT 0.95,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

CREATE TABLE forecasts (
    forecast_id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT,
    dept_id INT,
    target_date DATE,
    predicted_demand FLOAT NOT NULL,
    recommended_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
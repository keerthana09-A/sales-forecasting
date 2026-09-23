import { useState, useEffect } from 'react';
import './Dashboard.css';

interface RecommendationResponse {
  predicted_demand: number;
  current_stock: number;
  safety_stock: number;
  recommended_order: number;
  stock_status: string;
}

interface FeatureImportance {
  feature: string;
  importance: number;
}

export default function Dashboard() {
  const [currentStock] = useState<number>(600);
  const [safetyStock, setSafetyStock] = useState<number>(100);
  const [discount, setDiscount] = useState<number>(15);

  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [simulatedDemand, setSimulatedDemand] = useState<number | null>(null);
  const [explanations, setExplanations] = useState<FeatureImportance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchRecommendation = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_holiday: 0,
          promotional_discount: discount / 100,
          temperature: 72.5,
          fuel_price: 3.5,
          previous_week_sales: 950,
          current_stock: currentStock,
          safety_stock: safetyStock
        })
      });
      const data = await res.json();
      setRecommendation(data);
    } catch (err) {
      console.error('API Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatIfSimulation = async (baseDemand: number, discVal: number) => {
    try {
      const res = await fetch('http://localhost:8000/api/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_demand: baseDemand,
          discount_percentage: discVal
        })
      });
      const data = await res.json();
      setSimulatedDemand(data.simulated_demand);
    } catch (err) {
      console.error('What-If Error:', err);
    }
  };

  useEffect(() => {
    fetchRecommendation();
    fetch('http://localhost:8000/api/explainability')
     .then((res) => res.json())
     .then((data) => setExplanations(data))
     .catch(console.error);
  }, []);

  useEffect(() => {
    if (recommendation) {
      handleWhatIfSimulation(recommendation.predicted_demand, discount);
    }
  }, [discount, recommendation?.predicted_demand, safetyStock]);

  return (
    <div className="main-viewport">
      <header className="viewport-header">
        <div>
          <span className="pill-tag">AI Decision Engine</span>
          <h1 className="header-gradient-title">Retail Command Center</h1>
        </div>
        <button
          className={`btn-glow ${isLoading? 'loading' : ''}`}
          onClick={fetchRecommendation}
        >
          {isLoading? 'Processing...' : 'Sync AI Engine'}
        </button>
      </header>

      <section className="dashboard-grid metrics-row">
        <div className="glass-tile">
          <span className="tile-label">Predicted Demand</span>
          <div className="tile-value">{recommendation?.predicted_demand?? '--'} <span className="unit">units</span></div>
          <p className="tile-subtext text-cyan">Based on ML time-series model</p>
        </div>
        <div className="glass-tile">
          <span className="tile-label">Current Stock</span>
          <div className="tile-value">{currentStock} <span className="unit">units</span></div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill cyan" style={{ width: `${Math.min(100, (currentStock / 1200) * 100)}%` }} />
          </div>
        </div>
        <div className="glass-tile">
          <span className="tile-label">Safety Target</span>
          <div className="tile-value">{safetyStock} <span className="unit">units</span></div>
          <p className="tile-subtext text-muted">Minimum threshold</p>
        </div>
        <div className="glass-tile highlight-tile">
          <span className="tile-label">Recommended Order</span>
          <div className="tile-value glow-text">
            {recommendation?.recommended_order?? '--'} <span className="unit">units</span>
          </div>
          <span className="status-pill active-pulse">
            {recommendation?.stock_status || 'OPTIMAL'}
          </span>
        </div>
      </section>

      <section className="dashboard-grid two-column-layout">
        <div className="glass-card">
          <div className="card-top">
            <h3>What-If Demand Simulator</h3>
            <span className="badge-purple">Scenario Builder</span>
          </div>
          <div className="control-group">
            <div className="label-row">
              <label>Promotional Discount Scenario</label>
              <span className="range-value">{discount}%</span>
            </div>
            <input type="range" min="0" max="50" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="custom-range" />
          </div>
          <div className="control-group">
            <div className="label-row">
              <label>Adjust Stock Reserve</label>
              <span className="range-value">{safetyStock} units</span>
            </div>
            <input type="range" min="0" max="300" step="10" value={safetyStock} onChange={(e) => setSafetyStock(Number(e.target.value))} className="custom-range" />
          </div>
          <div className="simulation-preview">
            <div className="sim-metric">
              <span className="sim-title">Base Predicted</span>
              <span className="sim-val">{recommendation?.predicted_demand?? 0}</span>
            </div>
            <div className="sim-arrow">→</div>
            <div className="sim-metric">
              <span className="sim-title">Simulated Demand ({discount}% Off)</span>
              <span className="sim-val highlight">{simulatedDemand?? '--'}</span>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div className="card-top">
            <h3>Explainable AI (XAI)</h3>
            <span className="badge-blue">Feature Drivers</span>
          </div>
          <div className="explainability-list">
            {explanations.map((exp, idx) => {
              const percentage = (exp.importance * 100).toFixed(1);
              return (
                <div key={idx} className="xai-row">
                  <div className="xai-info">
                    <span className="xai-name">{exp.feature}</span>
                    <span className="xai-percentage">{percentage}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill purple" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
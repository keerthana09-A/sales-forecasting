import { useState } from 'react';
import './Inventory.css';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  safetyStock: number;
  predictedDemand: number;
  unitPrice: number;
}

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [inventory] = useState<InventoryItem[]>([
    { id: 'SKU-101', name: 'Nike Air Max 270', category: 'Footwear', currentStock: 120, safetyStock: 150, predictedDemand: 300, unitPrice: 150 },
    { id: 'SKU-102', name: 'Denim Jacket XL', category: 'Apparel', currentStock: 450, safetyStock: 100, predictedDemand: 280, unitPrice: 89.99 },
    { id: 'SKU-103', name: 'Leather Belt (Brown)', category: 'Accessories', currentStock: 80, safetyStock: 100, predictedDemand: 220, unitPrice: 35 },
    { id: 'SKU-104', name: 'Cotton Hoodie L', category: 'Apparel', currentStock: 600, safetyStock: 200, predictedDemand: 550, unitPrice: 65 },
    { id: 'SKU-105', name: 'Running Shorts M', category: 'Apparel', currentStock: 30, safetyStock: 80, predictedDemand: 190, unitPrice: 42 },
  ]);

  const filteredItems = inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (item: InventoryItem) => {
    const needed = item.predictedDemand + item.safetyStock - item.currentStock;
    if (item.currentStock < item.safetyStock) return { label: 'CRITICAL LOW', class: 'status-critical', order: needed };
    if (needed > 0) return { label: 'REORDER NEEDED', class: 'status-warning', order: needed };
    return { label: 'OPTIMAL', class: 'status-optimal', order: 0 };
  };

  return (
    <div className="inventory-viewport">
      <header className="viewport-header">
        <div>
          <h1 className="header-gradient-title">Inventory & Reorder Manager</h1>
        </div>
        <button className="btn-glow">+ Add New SKU</button>
      </header>

      <div className="filter-bar glass-card">
        <input
          type="text"
          placeholder="Search by SKU or Item Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-select"
        >
          <option value="All">All Categories</option>
          <option value="Apparel">Apparel</option>
          <option value="Footwear">Footwear</option>
          <option value="Accessories">Accessories</option>
        </select>
      </div>

      <div className="glass-card full-width">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU ID</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Safety Target</th>
                <th>Predicted Demand</th>
                <th>Rec. Order Qty</th>
                <th>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const status = getStockStatus(item);
                return (
                  <tr key={item.id}>
                    <td className="sku-code">{item.id}</td>
                    <td className="font-semibold">{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.currentStock} units</td>
                    <td>{item.safetyStock} units</td>
                    <td>{item.predictedDemand} units</td>
                    <td className="highlight-order">{status.order > 0? `${status.order} units` : '0'}</td>
                    <td>
                      <span className={`status-pill ${status.class}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
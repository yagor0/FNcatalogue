import { useState, useEffect } from 'react';
import { getHistory } from '../api';
import ProductCard from '../components/ProductCard';

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory().then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h1 className="page-title">تاریخچه مشاهده محصولات</h1>
      {loading ? (
        <p className="empty-state">در حال بارگذاری...</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>هنوز محصولی مشاهده نکرده‌اید.</p>
        </div>
      ) : (
        <div className="products-grid">
          {items.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </>
  );
}

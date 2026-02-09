import { useState, useEffect } from 'react';
import { getWishlist } from '../api';
import ProductCard from '../components/ProductCard';

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getWishlist().then(setItems).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <>
      <h1 className="page-title">لیست علاقه‌مندی</h1>
      {loading ? (
        <p className="empty-state">در حال بارگذاری...</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>هنوز محصولی به علاقه‌مندی اضافه نکرده‌اید.</p>
        </div>
      ) : (
        <div className="products-grid">
          {items.map(p => (
            <ProductCard key={p.id} product={p} inWishlist onWishlistChange={load} />
          ))}
        </div>
      )}
    </>
  );
}

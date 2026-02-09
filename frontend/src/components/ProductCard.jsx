import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addToWishlist, removeFromWishlist } from '../api';

function formatPrice(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('fa-IR').format(n) + ' تومان';
}

export default function ProductCard({ product, inWishlist = false, onWishlistChange }) {
  const [wishlist, setWishlist] = useState(inWishlist);
  const attrs = typeof product.attributes === 'string' ? (() => { try { return JSON.parse(product.attributes); } catch { return {}; } })() : (product.attributes || {});

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (wishlist) {
        await removeFromWishlist(product.id);
        setWishlist(false);
        onWishlistChange?.();
      } else {
        await addToWishlist(product.id);
        setWishlist(true);
        onWishlistChange?.();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const imgSrc = product.image?.startsWith('http') ? product.image : (product.image || '/placeholder.svg');
  return (
    <Link to={'/product/' + product.id} className="product-card">
      <div className="img-wrap">
        <img src={imgSrc} alt={product.name} onError={(e) => { e.target.src = 'https://via.placeholder.com/300?text=بدون+تصویر'; }} />
        <button type="button" className={'wish-btn' + (wishlist ? ' in-wishlist' : '')} onClick={toggleWishlist} title={wishlist ? 'حذف از علاقه‌مندی' : 'افزودن به علاقه‌مندی'}>
          ♥
        </button>
      </div>
      <div className="body">
        {product.brand && <div className="brand">{product.brand}</div>}
        <div className="name">{product.name}</div>
        {Object.keys(attrs).length > 0 && (
          <div className="attributes-list">
            {Object.entries(attrs).map(([k, v]) => (
              <span key={k}>{k}: {String(v)}</span>
            ))}
          </div>
        )}
        <div className="price">
          {formatPrice(product.price)}
          {product.stock !== undefined && <small> · موجودی {product.stock}</small>}
        </div>
      </div>
    </Link>
  );
}

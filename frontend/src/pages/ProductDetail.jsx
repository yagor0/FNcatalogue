import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProduct, recordView, addToWishlist, removeFromWishlist, getWishlist, submitReview, getRecommended } from '../api';
import ProductCard from '../components/ProductCard';

function formatPrice(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('fa-IR').format(n) + ' تومان';
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [recommended, setRecommended] = useState([]);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getProduct(id).then((data) => {
      setProduct(data);
      recordView(id).catch(console.error);
    }).catch(console.error);
    getWishlist().then(list => setWishlistIds(new Set(list.map(p => p.id)))).catch(console.error);
    getRecommended(4).then(setRecommended).catch(console.error);
  }, [id]);

  const handleWishlist = async () => {
    if (!product) return;
    const inList = wishlistIds.has(product.id);
    try {
      if (inList) {
        await removeFromWishlist(product.id);
        setWishlistIds(prev => { const s = new Set(prev); s.delete(product.id); return s; });
      } else {
        await addToWishlist(product.id);
        setWishlistIds(prev => new Set([...prev, product.id]));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await submitReview(id, { author: reviewAuthor, rating: reviewRating, comment: reviewComment });
      setSubmitted(true);
      const newReview = { author: reviewAuthor || 'مهمان', rating: reviewRating, comment: reviewComment };
      setProduct(prev => prev ? { ...prev, reviews: [...(prev.reviews || []), newReview] } : null);
    } catch (e) {
      console.error(e);
    }
  };

  if (!product) return <div className="empty-state">در حال بارگذاری...</div>;

  const attrs = typeof product.attributes === 'string' ? (() => { try { return JSON.parse(product.attributes); } catch { return {}; } })() : (product.attributes || {});
  const imgSrc = product.image?.startsWith('http') ? product.image : (product.image || '/placeholder.svg');

  return (
    <>
      <div className="product-detail">
        <div className="gallery">
          <img src={imgSrc} alt={product.name} onError={(e) => { e.target.src = 'https://via.placeholder.com/500?text=بدون+تصویر'; }} />
        </div>
        <div className="info">
          <h1>{product.name}</h1>
          <div className="meta">
            {product.brand && <span>برند: {product.brand}</span>}
            {product.category_name && <span> · دسته: {product.category_name}</span>}
          </div>
          <div className="price">{formatPrice(product.price)}</div>
          <div className={'stock ' + (product.stock > 0 ? 'in-stock' : 'out-of-stock')}>
            {product.stock > 0 ? `موجود در انبار (${product.stock})` : 'ناموجود'}
          </div>
          {Object.keys(attrs).length > 0 && (
            <div className="attributes-list">
              {Object.entries(attrs).map(([k, v]) => (
                <span key={k}>{k}: {String(v)}</span>
              ))}
            </div>
          )}
          <button type="button" className={'btn ' + (wishlistIds.has(product.id) ? 'in-wishlist' : '')} onClick={handleWishlist}>
            {wishlistIds.has(product.id) ? 'حذف از علاقه‌مندی' : 'افزودن به علاقه‌مندی'}
          </button>
          <div className="description">
            <h3>توضیحات</h3>
            <p>{product.description || 'بدون توضیح.'}</p>
          </div>
        </div>
      </div>

      <div className="reviews-section">
        <h3>نظرات مشتریان</h3>
        {!submitted ? (
          <form className="review-form" onSubmit={handleSubmitReview}>
            <input type="text" placeholder="نام شما" value={reviewAuthor} onChange={(e) => setReviewAuthor(e.target.value)} />
            <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ستاره</option>)}
            </select>
            <textarea placeholder="نظر شما" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
            <button type="submit" className="btn">ثبت نظر</button>
          </form>
        ) : (
          <p className="empty-state">نظر شما ثبت شد.</p>
        )}
        {(product.reviews || []).map((r, i) => (
          <div key={i} className="review-item">
            <div className="author">{r.author}</div>
            <div className="rating">{'★'.repeat(r.rating || 0)}{'☆'.repeat(5 - (r.rating || 0))}</div>
            <p>{r.comment}</p>
          </div>
        ))}
      </div>

      {recommended.length > 0 && (
        <>
          <h2 className="section-title">محصولات پیشنهادی</h2>
          <div className="products-grid">
            {recommended.filter(p => p.id !== product.id).slice(0, 4).map(p => (
              <ProductCard key={p.id} product={p} inWishlist={wishlistIds.has(p.id)} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

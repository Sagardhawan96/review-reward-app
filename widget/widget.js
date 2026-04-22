(function () {
  if (window.ReviewRewardLoaded) return;
  window.ReviewRewardLoaded = true;

  const APP_URL = 'https://localhost:3000';

  function getOrderId() {
    const match = window.location.pathname.match(/orders\/([^/?]+)/);
    return match ? match[1] : null;
  }

  function getShopDomain() {
    return window.Shopify ? window.Shopify.shop : window.location.hostname;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #rr-widget { font-family: -apple-system, sans-serif; max-width: 540px; margin: 40px auto; padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
      #rr-widget h2 { font-size: 20px; font-weight: 600; margin-bottom: 6px; color: #111; }
      #rr-widget p.rr-sub { font-size: 14px; color: #6b7280; margin-bottom: 24px; }
      .rr-stars { display: flex; gap: 8px; margin-bottom: 20px; }
      .rr-star { font-size: 32px; cursor: pointer; color: #d1d5db; transition: color 0.15s; }
      .rr-star.active { color: #f59e0b; }
      .rr-label { font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; display: block; }
      #rr-text { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; resize: vertical; min-height: 100px; box-sizing: border-box; }
      #rr-text:focus { outline: none; border-color: #6366f1; }
      .rr-photo-area { margin: 16px 0; }
      .rr-photo-label { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border: 1.5px dashed #d1d5db; border-radius: 8px; cursor: pointer; font-size: 14px; color: #6b7280; transition: border-color 0.2s; }
      .rr-photo-label:hover { border-color: #6366f1; color: #6366f1; }
      #rr-photo { display: none; }
      .rr-photo-tip { font-size: 12px; color: #9ca3af; margin-top: 6px; }
      .rr-tier-badge { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
      .rr-tier-1 { background: #fef3c7; color: #92400e; }
      .rr-tier-2 { background: #ede9fe; color: #4c1d95; }
      #rr-submit { margin-top: 20px; width: 100%; padding: 12px; background: #6366f1; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
      #rr-submit:hover { background: #4f46e5; }
      #rr-submit:disabled { background: #a5b4fc; cursor: not-allowed; }
      .rr-success { text-align: center; padding: 32px 0; }
      .rr-success h3 { font-size: 20px; color: #111; margin-bottom: 8px; }
      .rr-success p { font-size: 14px; color: #6b7280; margin-bottom: 16px; }
      .rr-code-box { background: #f3f4f6; border: 1.5px dashed #6366f1; border-radius: 8px; padding: 16px; font-size: 22px; font-weight: 700; letter-spacing: 3px; color: #4f46e5; }
      .rr-expiry { font-size: 12px; color: #9ca3af; margin-top: 8px; }
      #rr-char-count { font-size: 12px; color: #9ca3af; text-align: right; margin-top: 4px; }
    `;
    document.head.appendChild(style);
  }

  function buildWidget(shopDomain, orderId, customerEmail) {
    const container = document.createElement('div');
    container.id = 'rr-widget';
    container.innerHTML = `
      <h2>How was your order?</h2>
      <p class="rr-sub">Leave a review and earn a reward — add a photo for a bigger discount!</p>
      <div class="rr-stars">
        ${[1,2,3,4,5].map(n => `<span class="rr-star" data-star="${n}">&#9733;</span>`).join('')}
      </div>
      <label class="rr-label">Your review</label>
      <textarea id="rr-text" placeholder="Tell others about your experience..."></textarea>
      <div id="rr-char-count">0 characters</div>
      <div class="rr-photo-area">
        <label class="rr-photo-label" for="rr-photo">
          + Add a photo <span style="font-size:11px;background:#ede9fe;color:#4c1d95;padding:2px 8px;border-radius:10px;">earn 10% off</span>
        </label>
        <input type="file" id="rr-photo" accept="image/*">
        <p class="rr-photo-tip">Without photo: flat ₹200 off. With photo: 10% off your next order.</p>
        <div id="rr-tier-indicator"></div>
      </div>
      <button id="rr-submit">Submit Review & Get Reward</button>
    `;

    let selectedRating = 0;

    container.querySelectorAll('.rr-star').forEach(star => {
      star.addEventListener('mouseover', () => {
        container.querySelectorAll('.rr-star').forEach(s => {
          s.classList.toggle('active', s.dataset.star <= star.dataset.star);
        });
      });
      star.addEventListener('click', () => {
        selectedRating = parseInt(star.dataset.star);
      });
      star.addEventListener('mouseout', () => {
        container.querySelectorAll('.rr-star').forEach(s => {
          s.classList.toggle('active', s.dataset.star <= selectedRating);
        });
      });
    });

    const textarea = container.querySelector('#rr-text');
    const charCount = container.querySelector('#rr-char-count');
    textarea.addEventListener('input', () => {
      charCount.textContent = `${textarea.value.length} characters`;
    });

    const photoInput = container.querySelector('#rr-photo');
    const tierIndicator = container.querySelector('#rr-tier-indicator');
    photoInput.addEventListener('change', () => {
      if (photoInput.files.length > 0) {
        tierIndicator.innerHTML = '<span class="rr-tier-badge rr-tier-2">Photo added — you will earn 10% off!</span>';
      } else {
        tierIndicator.innerHTML = '';
      }
    });

    container.querySelector('#rr-submit').addEventListener('click', async () => {
      if (!selectedRating) return alert('Please select a star rating.');
      if (!textarea.value.trim()) return alert('Please write a review.');

      const btn = container.querySelector('#rr-submit');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      const formData = new FormData();
      formData.append('shopDomain', shopDomain);
      formData.append('orderId', orderId);
      formData.append('customerEmail', customerEmail);
      formData.append('rating', selectedRating);
      formData.append('reviewText', textarea.value.trim());
      if (photoInput.files[0]) formData.append('photo', photoInput.files[0]);

      try {
        const res = await fetch(`${APP_URL}/api/reviews`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.success) {
          const expiry = data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
          container.innerHTML = `
            <div class="rr-success">
              <h3>Thank you for your review!</h3>
              <p>${data.reward}</p>
              ${data.code ? `
                <div class="rr-code-box">${data.code}</div>
                <p class="rr-expiry">Valid until ${expiry}. Use at checkout.</p>
              ` : '<p>Your reward code will be emailed to you shortly.</p>'}
            </div>
          `;
        } else {
          alert(data.error || 'Something went wrong. Please try again.');
          btn.disabled = false;
          btn.textContent = 'Submit Review & Get Reward';
        }
      } catch (err) {
        alert('Could not connect. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Submit Review & Get Reward';
      }
    });

    return container;
  }

  function init() {
    const shopDomain = getShopDomain();
    const orderId = getOrderId();
    const customerEmail = window.RR_CUSTOMER_EMAIL || '';

    if (!orderId) return;

    injectStyles();

    const target = document.querySelector('.rr-inject-here') || document.querySelector('main') || document.body;
    target.appendChild(buildWidget(shopDomain, orderId, customerEmail));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
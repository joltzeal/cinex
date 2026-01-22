// Check if current host is blacklisted before initializing
(async function checkBlacklist() {
  const currentHost = window.location.hostname;
  const { blacklist = [] } = await chrome.storage.local.get(['blacklist']);

  if (blacklist.includes(currentHost)) {
    console.log('Cinex extension disabled on blacklisted host:', currentHost);
    return; // Exit early, don't initialize any functionality
  }

  // Continue with normal extension initialization
  initExtension();
})();

function initExtension() {
  // Regular expression to match codes like ABCD-1234
  // Letters: 2-5 characters, Numbers: 2-4 characters
  // Using lazy matching to avoid matching longer strings
  const CODE_PATTERN = /\b([A-Za-z]{2,5})-(\d{2,4})\b/g;

  // Class name for highlighted elements
  const HIGHLIGHT_CLASS = 'cinex-code-highlight';
  const CARD_CLASS = 'cinex-hover-card';

  // Global state
  let currentCard = null;
  let currentCode = null;
  let hoverTimeout = null;

// Function to highlight codes in text nodes
function highlightCodes(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    const matches = [...text.matchAll(CODE_PATTERN)];

    if (matches.length > 0) {
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      matches.forEach((match) => {
        const matchText = match[0];
        const matchIndex = match.index;

        // Add text before the match
        if (matchIndex > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex, matchIndex))
          );
        }

        // Create highlighted span for the match
        const span = document.createElement('span');
        span.className = HIGHLIGHT_CLASS;
        span.textContent = matchText;
        span.dataset.code = matchText.toUpperCase();
        fragment.appendChild(span);

        lastIndex = matchIndex + matchText.length;
      });

      // Add remaining text after the last match
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      // Replace the text node with the fragment
      node.parentNode.replaceChild(fragment, node);
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // Skip script, style, already highlighted elements, and card elements
    if (
      node.tagName !== 'SCRIPT' &&
      node.tagName !== 'STYLE' &&
      !node.classList.contains(HIGHLIGHT_CLASS) &&
      !node.classList.contains(CARD_CLASS) &&
      !node.hasAttribute('data-cinex-no-highlight')
    ) {
      // Process child nodes
      const children = Array.from(node.childNodes);
      children.forEach((child) => highlightCodes(child));
    }
  }
}

// Function to process the entire document
function processDocument() {
  highlightCodes(document.body);
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', processDocument);
} else {
  processDocument();
}

// Observe DOM changes to highlight dynamically added content
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
        highlightCodes(node);
      }
    });
  });
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Hover handlers with delay
document.addEventListener('mouseover', (event) => {
  if (event.target.classList.contains(HIGHLIGHT_CLASS)) {
    const code = event.target.dataset.code;

    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }

    // Set a 1 second delay before showing the card
    hoverTimeout = setTimeout(() => {
      showCard(code, event.target);
    }, 1000);
  }
});

document.addEventListener('mouseout', (event) => {
  if (event.target.classList.contains(HIGHLIGHT_CLASS)) {
    // Clear the timeout if mouse leaves before 1 second
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
  }
});

// Function to create and show the card
async function showCard(code, targetElement) {
  // Remove existing card if any
  hideCard();

  // Create card element
  const card = document.createElement('div');
  card.className = CARD_CLASS;
  currentCard = card;
  currentCode = code;

  // Show loading state
  card.innerHTML = `
    <div class="cinex-card-loading">
      <div class="cinex-spinner"></div>
      <p>加载中...</p>
    </div>
  `;

  document.body.appendChild(card);

  // Fetch movie data via background script to avoid CORS
  try {
    const { apiUrl } = await chrome.storage.local.get(['apiUrl']);

    if (!apiUrl) {
      throw new Error('请先在扩展中配置 API URL');
    }

    // Send message to background script to fetch data
    const response = await chrome.runtime.sendMessage({
      action: 'fetchMovie',
      code: code,
      apiUrl: apiUrl,
      token: null // Not needed for this API
    });

    if (!response.success) {
      throw new Error(response.error || '获取数据失败');
    }

    const movie = response.data;
    const detail = movie.detail;

    // Render movie card (async)
    await renderMovieCard(card, movie, detail);

  } catch (error) {
    card.innerHTML = `
      <div class="cinex-card-error">
        <p class="cinex-error-title">加载失败</p>
        <p class="cinex-error-message">${error.message}</p>
      </div>
    `;
  }
}

// Function to proxy javbus images
function proxyImageUrl(url, apiUrl) {
  if (!url) return url;
  if (url.startsWith('https://www.javbus.com/')) {
    return `${apiUrl}/api/subscribe/javbus/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// Function to render movie card content
async function renderMovieCard(card, movie, detail) {
  const stars = detail.stars || [];
  const genres = detail.genres || [];
  const samples = detail.samples || [];
  const director = detail.director || null;
  const producer = detail.producer || null;
  const publisher = detail.publisher || null;
  const series = detail.series || null;
  const magnets = movie.magnets || [];

  // Get apiUrl from storage
  const { apiUrl } = await chrome.storage.local.get(['apiUrl']);

  // Proxy images
  const coverUrl = proxyImageUrl(movie.cover, apiUrl);
  const posterUrl = proxyImageUrl(movie.poster || movie.cover, apiUrl);

  // Image preview state
  let currentPreviewIndex = 0;
  let previewImages = [];

  // Function to show image preview
  const showImagePreview = (images, startIndex) => {
    previewImages = images;
    currentPreviewIndex = startIndex;

    const modal = document.createElement('div');
    modal.className = 'cinex-image-preview-modal';
    modal.setAttribute('data-cinex-no-highlight', 'true');

    const updatePreview = () => {
      modal.innerHTML = `
        <div class="cinex-image-preview-content">
          <button class="cinex-image-preview-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          ${previewImages.length > 1 ? `
            <button class="cinex-image-preview-nav prev">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button class="cinex-image-preview-nav next">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          ` : ''}
          <img src="${previewImages[currentPreviewIndex]}" class="cinex-image-preview-img" />
          ${previewImages.length > 1 ? `
            <div class="cinex-image-preview-counter">${currentPreviewIndex + 1} / ${previewImages.length}</div>
          ` : ''}
        </div>
      `;

      // Add event listeners
      const closeBtn = modal.querySelector('.cinex-image-preview-close');
      closeBtn.addEventListener('click', () => modal.remove());

      const prevBtn = modal.querySelector('.cinex-image-preview-nav.prev');
      const nextBtn = modal.querySelector('.cinex-image-preview-nav.next');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          currentPreviewIndex = (currentPreviewIndex - 1 + previewImages.length) % previewImages.length;
          updatePreview();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          currentPreviewIndex = (currentPreviewIndex + 1) % previewImages.length;
          updatePreview();
        });
      }

      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });

      // Keyboard navigation
      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', handleKeydown);
        } else if (e.key === 'ArrowLeft' && previewImages.length > 1) {
          currentPreviewIndex = (currentPreviewIndex - 1 + previewImages.length) % previewImages.length;
          updatePreview();
        } else if (e.key === 'ArrowRight' && previewImages.length > 1) {
          currentPreviewIndex = (currentPreviewIndex + 1) % previewImages.length;
          updatePreview();
        }
      };
      document.addEventListener('keydown', handleKeydown);
    };

    updatePreview();
    document.body.appendChild(modal);
  };

  // Render action buttons based on movie status
  const renderActionButtons = () => {
    const status = movie.status || 'uncheck';
    const statusMap = {
      uncheck: { label: '添加订阅', variant: 'default' },
      subscribed: { label: '取消订阅', variant: 'destructive' },
      downloading: { label: '下载中', variant: 'secondary' },
      downloaded: { label: '已下载', variant: 'secondary' },
      added: { label: '已入库', variant: 'success' }
    };

    return `
      <div class="cinex-sidebar-card">
        <h4 class="cinex-sidebar-title">操作</h4>
        <div class="cinex-sidebar-content">
          <div class="cinex-action-buttons">
            <button class="cinex-action-btn cinex-action-btn-${statusMap[status]?.variant || 'default'}" data-action="${status}">
              ${status === 'added' ? `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="9 12 12 15 16 10"></polyline>
                </svg>
              ` : ''}
              ${statusMap[status]?.label || '添加订阅'}
            </button>
            <button class="cinex-action-btn cinex-action-btn-outline" data-action="review">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              评价
            </button>
          </div>
        </div>
      </div>
    `;
  };

  // Render review form
  const renderReviewForm = () => {
    return `
      <div class="cinex-sidebar-card cinex-review-card" style="display:none">
        <h4 class="cinex-sidebar-title">提交你的评价</h4>
        <div class="cinex-sidebar-content">
          <div class="cinex-review-form">
            <div class="cinex-review-section">
              <label class="cinex-review-label">评分</label>
              <div class="cinex-rating-container">
                ${Array.from({ length: 5 }).map((_, i) => `
                  <button class="cinex-rating-star" data-rating="${i + 1}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </button>
                `).join('')}
              </div>
              <span class="cinex-rating-text">请选择星级</span>
            </div>

            <div class="cinex-review-section">
              <label class="cinex-review-label">短评</label>
              <textarea class="cinex-review-textarea" placeholder="请输入你的短评..." rows="4"></textarea>
            </div>

            <div class="cinex-review-section">
              <label class="cinex-review-label">标签</label>
              <div class="cinex-tags-input-container">
                <div class="cinex-tags-list"></div>
                <input type="text" class="cinex-tag-input" placeholder="添加标签，按回车确认..." />
              </div>
            </div>

            <div class="cinex-review-actions">
              <button class="cinex-action-btn cinex-action-btn-outline" data-action="cancel-review">取消</button>
              <button class="cinex-action-btn cinex-action-btn-default" data-action="submit-review">提交</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Render magnets section as a table
  const renderMagnets = () => {
    if (magnets.length === 0) return '';

    return `
      <div class="cinex-sidebar-card cinex-magnet-section">
        <h4 class="cinex-sidebar-title">${detail.id} 资源下载</h4>
        <div class="cinex-magnet-table-container">
          <table class="cinex-magnet-table">
            <thead>
              <tr>
                <th>标题</th>
                <th class="cinex-magnet-size-col">大小</th>
                <th class="cinex-magnet-action-col">操作</th>
              </tr>
            </thead>
            <tbody>
              ${magnets.map(magnet => `
                <tr>
                  <td class="cinex-magnet-title-cell">
                    <div class="cinex-magnet-badges">
                      ${magnet.isHD ? '<span class="cinex-magnet-badge cinex-magnet-hd">HD</span>' : ''}
                      ${magnet.hasSubtitle ? '<span class="cinex-magnet-badge cinex-magnet-subtitle">字幕</span>' : ''}
                    </div>
                    <div class="cinex-magnet-title" title="${magnet.title || magnet.link}">
                      ${magnet.title || magnet.link}
                    </div>
                  </td>
                  <td class="cinex-magnet-size-cell">${magnet.size || 'N/A'}</td>
                  <td class="cinex-magnet-action-cell">
                    <button class="cinex-magnet-copy" data-link="${magnet.link}" title="复制磁力链接">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  // Render info grid section
  const renderInfoGrid = () => {
    return `
      <div class="cinex-info-grid">
        <div class="cinex-info-item">
          <span class="cinex-info-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            发行日期
          </span>
          <span class="cinex-info-value">${detail.date || 'N/A'}</span>
        </div>
        <div class="cinex-info-item">
          <span class="cinex-info-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            时长
          </span>
          <span class="cinex-info-value">${detail.videoLength ? `${detail.videoLength} 分钟` : 'N/A'}</span>
        </div>
        <div class="cinex-info-item cinex-info-item-wide">
          <span class="cinex-info-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
              <polyline points="17 2 12 7 7 2"></polyline>
            </svg>
            导演
          </span>
          <span class="cinex-info-value">${director ? director.name : 'N/A'}</span>
        </div>
      </div>
    `;
  };

  card.innerHTML = `
    <button class="cinex-close-btn" onclick="this.closest('.${CARD_CLASS}').remove()">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>

    <div class="cinex-card-scroll-container" data-cinex-no-highlight>
      <div class="cinex-card-banner">
        <img src="${coverUrl}" alt="${detail.title}" class="cinex-banner-img" />
        <div class="cinex-banner-overlay"></div>
        <div class="cinex-banner-gradient"></div>
        <div class="cinex-banner-content">
          <div class="cinex-banner-poster">
            <img src="${coverUrl}" alt="${detail.title}" />
          </div>
          <div class="cinex-banner-info">
            <div class="cinex-banner-badges">
              ${detail.date ? `<span class="cinex-badge">${detail.date}</span>` : ''}
              ${detail.videoLength ? `<span class="cinex-badge"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;margin-right:4px;vertical-align:middle"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${detail.videoLength} 分钟</span>` : ''}
            </div>
            <h3 class="cinex-banner-title" style="cursor:pointer" data-movie-url="https://www.javbus.com/${detail.id}">${detail.title}</h3>
            <div class="cinex-banner-meta">
              <span class="cinex-badge cinex-badge-primary" data-copy-id="${detail.id}" style="cursor:pointer" title="点击复制番号">${detail.id}</span>
              ${stars.slice(0, 3).map(star => `<span class="cinex-badge cinex-badge-outline" data-star-url="https://www.javbus.com/star/${star.id}" style="cursor:pointer"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;margin-right:4px;vertical-align:middle;opacity:0.7"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>${star.name}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="cinex-card-body">
        <div class="cinex-card-main">
          ${renderInfoGrid()}

          ${genres.length > 0 ? `
            <div class="cinex-card-section">
              <h4 class="cinex-section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                标签
              </h4>
              <div class="cinex-tags">
                ${genres.map(genre => `<span class="cinex-tag">${genre.name}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${samples.length > 0 ? `
            <div class="cinex-card-section">
              <h4 class="cinex-section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                  <line x1="7" y1="2" x2="7" y2="22"></line>
                  <line x1="17" y1="2" x2="17" y2="22"></line>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <line x1="2" y1="7" x2="7" y2="7"></line>
                  <line x1="2" y1="17" x2="7" y2="17"></line>
                  <line x1="17" y1="17" x2="22" y2="17"></line>
                  <line x1="17" y1="7" x2="22" y2="7"></line>
                </svg>
                预览剧照
              </h4>
              <div class="cinex-samples">
                ${samples.map((sample, index) => `
                  <img src="${proxyImageUrl(sample.src, apiUrl)}" alt="Sample" class="cinex-sample-img" data-sample-index="${index}" />
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="cinex-card-sidebar">
          ${renderActionButtons()}
          ${renderReviewForm()}

          ${producer || publisher || series ? `
            <div class="cinex-sidebar-card">
              <h4 class="cinex-sidebar-title">发行信息</h4>
              <div class="cinex-sidebar-content">
                ${producer ? `
                  <div class="cinex-sidebar-item">
                    <span class="cinex-sidebar-label">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                        <line x1="7" y1="2" x2="7" y2="22"></line>
                        <line x1="17" y1="2" x2="17" y2="22"></line>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                      </svg>
                      制作商
                    </span>
                    <span class="cinex-sidebar-value" data-producer-url="https://www.javbus.com/studio/${producer.id}" style="cursor:pointer">${producer.name}</span>
                  </div>
                ` : ''}
                ${publisher ? `
                  <div class="cinex-sidebar-item">
                    <span class="cinex-sidebar-label">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 21h18"></path>
                        <path d="M9 8h1"></path>
                        <path d="M9 12h1"></path>
                        <path d="M9 16h1"></path>
                        <path d="M14 8h1"></path>
                        <path d="M14 12h1"></path>
                        <path d="M14 16h1"></path>
                        <path d="M6 3v18"></path>
                        <path d="M18 3v18"></path>
                        <path d="M6 3h12"></path>
                      </svg>
                      发行商
                    </span>
                    <span class="cinex-sidebar-value" data-publisher-url="https://www.javbus.com/label/${publisher.id}" style="cursor:pointer">${publisher.name}</span>
                  </div>
                ` : ''}
                ${series ? `
                  <div class="cinex-sidebar-item">
                    <span class="cinex-sidebar-label">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                      </svg>
                      系列
                    </span>
                    <span class="cinex-sidebar-value" data-series-url="https://www.javbus.com/series/${series.id}" style="cursor:pointer">${series.name}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          ${renderMagnets()}
        </div>
      </div>
    </div>
  `;

  // Add event listeners for copy magnet buttons
  const copyButtons = card.querySelectorAll('.cinex-magnet-copy');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const link = this.getAttribute('data-link');
      navigator.clipboard.writeText(link).then(() => {
        // Show copied feedback
        const originalHTML = this.innerHTML;
        this.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        this.style.color = '#10b981';
        setTimeout(() => {
          this.innerHTML = originalHTML;
          this.style.color = '';
        }, 2000);
      });
    });
  });

  // Add event listener for movie title click (jump to javbus)
  const movieTitle = card.querySelector('[data-movie-url]');
  if (movieTitle) {
    movieTitle.addEventListener('click', function() {
      const url = this.getAttribute('data-movie-url');
      window.open(url, '_blank');
    });
  }

  // Add event listener for movie ID badge click (copy ID)
  const idBadge = card.querySelector('[data-copy-id]');
  if (idBadge) {
    idBadge.addEventListener('click', function() {
      const id = this.getAttribute('data-copy-id');
      navigator.clipboard.writeText(id).then(() => {
        // Show copied feedback
        const originalContent = this.innerHTML;
        this.innerHTML = `${id} <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;margin-left:4px;vertical-align:middle"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => {
          this.innerHTML = originalContent;
        }, 2000);
      });
    });
  }

  // Add event listeners for star badges click (jump to star page)
  const starBadges = card.querySelectorAll('[data-star-url]');
  starBadges.forEach(badge => {
    badge.addEventListener('click', function() {
      const url = this.getAttribute('data-star-url');
      window.open(url, '_blank');
    });
  });

  // Add event listeners for producer/publisher/series click (jump to respective pages)
  const producerValue = card.querySelector('[data-producer-url]');
  if (producerValue) {
    producerValue.addEventListener('click', function() {
      const url = this.getAttribute('data-producer-url');
      window.open(url, '_blank');
    });
  }

  const publisherValue = card.querySelector('[data-publisher-url]');
  if (publisherValue) {
    publisherValue.addEventListener('click', function() {
      const url = this.getAttribute('data-publisher-url');
      window.open(url, '_blank');
    });
  }

  const seriesValue = card.querySelector('[data-series-url]');
  if (seriesValue) {
    seriesValue.addEventListener('click', function() {
      const url = this.getAttribute('data-series-url');
      window.open(url, '_blank');
    });
  }

  // Add event listeners for sample images
  const sampleImages = card.querySelectorAll('.cinex-sample-img');
  if (sampleImages.length > 0) {
    const imageUrls = samples.map(sample => proxyImageUrl(sample.src, apiUrl));
    sampleImages.forEach((img, index) => {
      img.addEventListener('click', () => {
        showImagePreview(imageUrls, index);
      });
    });
  }

  // Review form state
  let currentRating = 0;
  let reviewTags = [document.title]; // 默认添加当前网页标题作为标签

  // Render initial tags
  const tagsList = card.querySelector('.cinex-tags-list');
  if (tagsList) {
    renderTags();
  }

  // Add event listeners for action buttons
  const actionButtons = card.querySelectorAll('[data-action]');
  actionButtons.forEach(btn => {
    btn.addEventListener('click', async function() {
      const action = this.getAttribute('data-action');

      if (action === 'review') {
        // Show review form
        const reviewCard = card.querySelector('.cinex-review-card');
        if (reviewCard) {
          reviewCard.style.display = reviewCard.style.display === 'none' ? 'block' : 'none';
        }
      } else if (action === 'cancel-review') {
        // Hide review form and reset
        const reviewCard = card.querySelector('.cinex-review-card');
        if (reviewCard) {
          reviewCard.style.display = 'none';
          currentRating = 0;
          reviewTags = [];
          card.querySelector('.cinex-review-textarea').value = '';
          card.querySelector('.cinex-tags-list').innerHTML = '';
          updateRatingDisplay();
        }
      } else if (action === 'submit-review') {
        // Submit review
        const comment = card.querySelector('.cinex-review-textarea').value;
        await handleSubmitReview({
          rating: currentRating.toString(),
          comment,
          tags: reviewTags
        });
      } else if (action === 'uncheck') {
        // Handle subscribe
        await handleSubscribeMovie();
      } else if (action === 'subscribed') {
        // Handle unsubscribe
        await handleUnsubscribeMovie();
      }
    });
  });

  // Handle rating stars
  const ratingStars = card.querySelectorAll('.cinex-rating-star');
  ratingStars.forEach((star, index) => {
    star.addEventListener('click', () => {
      currentRating = index + 1;
      updateRatingDisplay();
    });

    star.addEventListener('mouseenter', () => {
      highlightStars(index + 1);
    });
  });

  const ratingContainer = card.querySelector('.cinex-rating-container');
  if (ratingContainer) {
    ratingContainer.addEventListener('mouseleave', () => {
      highlightStars(currentRating);
    });
  }

  function highlightStars(count) {
    ratingStars.forEach((star, index) => {
      if (index < count) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  }

  function updateRatingDisplay() {
    highlightStars(currentRating);
    const ratingText = card.querySelector('.cinex-rating-text');
    if (ratingText) {
      ratingText.textContent = currentRating === 0 ? '请选择星级' : `${currentRating} 星`;
    }
  }

  // Handle tag input
  const tagInput = card.querySelector('.cinex-tag-input');
  // tagsList is already declared above at line 642

  if (tagInput) {
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && tagInput.value.trim()) {
        e.preventDefault();
        const tagText = tagInput.value.trim();
        if (!reviewTags.includes(tagText)) {
          reviewTags.push(tagText);
          renderTags();
        }
        tagInput.value = '';
      }
    });
  }

  function renderTags() {
    if (tagsList) {
      tagsList.innerHTML = reviewTags.map((tag, index) => `
        <span class="cinex-review-tag">
          ${tag}
          <button class="cinex-tag-remove" data-tag-index="${index}">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </span>
      `).join('');

      // Add remove listeners
      const removeButtons = tagsList.querySelectorAll('.cinex-tag-remove');
      removeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.getAttribute('data-tag-index'));
          reviewTags.splice(index, 1);
          renderTags();
        });
      });
    }
  }

  // Handle subscribe movie
  async function handleSubscribeMovie() {
    try {
      const result = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'subscribeMovie',
            movieId: detail.id,
            apiUrl: apiUrl
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (result.success) {
        alert('订阅成功');
        // Update button state
        movie.status = 'subscribed';
        const actionBtn = card.querySelector('[data-action="uncheck"]');
        if (actionBtn) {
          actionBtn.setAttribute('data-action', 'subscribed');
          actionBtn.className = 'cinex-action-btn cinex-action-btn-destructive';
          actionBtn.textContent = '取消订阅';
        }
      } else {
        alert(result.error || '订阅失败');
      }
    } catch (error) {
      console.error('订阅失败:', error);
      alert('订阅失败: ' + error.message);
    }
  }

  // Handle unsubscribe movie
  async function handleUnsubscribeMovie() {
    try {
      const result = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'unsubscribeMovie',
            movieId: detail.id,
            apiUrl: apiUrl
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (result.success) {
        alert('取消订阅成功');
        // Update button state
        movie.status = 'uncheck';
        const actionBtn = card.querySelector('[data-action="subscribed"]');
        if (actionBtn) {
          actionBtn.setAttribute('data-action', 'uncheck');
          actionBtn.className = 'cinex-action-btn cinex-action-btn-default';
          actionBtn.textContent = '添加订阅';
        }
      } else {
        alert(result.error || '取消订阅失败');
      }
    } catch (error) {
      console.error('取消订阅失败:', error);
      alert('取消订阅失败: ' + error.message);
    }
  }

  // Handle submit review
  async function handleSubmitReview(data) {
    try {
      const result = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'submitReview',
            movieId: detail.id,
            data: data,
            apiUrl: apiUrl
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (result.success) {
        alert('提交评价成功');
        // Hide review form and reset
        const reviewCard = card.querySelector('.cinex-review-card');
        if (reviewCard) {
          reviewCard.style.display = 'none';
          currentRating = 0;
          reviewTags = [document.title];
          card.querySelector('.cinex-review-textarea').value = '';
          renderTags();
          updateRatingDisplay();
        }
      } else {
        alert(result.error || '提交评价失败');
      }
    } catch (error) {
      console.error('提交评价失败:', error);
      alert('提交评价失败: ' + error.message);
    }
  }
}

// Function to hide the card
function hideCard() {
  if (currentCard) {
    currentCard.remove();
    currentCard = null;
    currentCode = null;
  }
  // Clear any pending hover timeout
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
}

// Close card on Escape key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideCard();
  }
});

} // End of initExtension()

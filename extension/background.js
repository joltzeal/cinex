// Background script to handle API requests without CORS restrictions

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'toggleBlacklist',
    title: '将此网站加入/移出黑名单',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'toggleBlacklist') {
    const url = new URL(tab.url);
    const host = url.hostname;

    // Get current blacklist
    const { blacklist = [] } = await chrome.storage.local.get(['blacklist']);

    // Toggle host in blacklist
    const index = blacklist.indexOf(host);
    if (index > -1) {
      // Remove from blacklist
      blacklist.splice(index, 1);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Cinex 扩展',
        message: `已将 ${host} 从黑名单中移除`
      });
    } else {
      // Add to blacklist
      blacklist.push(host);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Cinex 扩展',
        message: `已将 ${host} 添加到黑名单`
      });
    }

    // Save updated blacklist
    await chrome.storage.local.set({ blacklist });

    // Reload the tab to apply changes
    chrome.tabs.reload(tab.id);
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchMovie') {
    handleFetchMovie(request.code, request.apiUrl, request.token)
      .then(sendResponse)
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });

    // Return true to indicate we'll send response asynchronously
    return true;
  } else if (request.action === 'subscribeMovie') {
    handleSubscribeMovie(request.movieId, request.apiUrl)
      .then(sendResponse)
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  } else if (request.action === 'unsubscribeMovie') {
    handleUnsubscribeMovie(request.movieId, request.apiUrl)
      .then(sendResponse)
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  } else if (request.action === 'submitReview') {
    handleSubmitReview(request.movieId, request.data, request.apiUrl)
      .then(sendResponse)
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });
    return true;
  }
});

// Function to fetch movie data from API
async function handleFetchMovie(code, apiUrl, token) {
  try {
    if (!apiUrl) {
      throw new Error('请先在扩展中配置 API URL');
    }

    const response = await fetch(`${apiUrl}/api/movie/${code}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = '获取数据失败';

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use status-based messages
        if (response.status === 404) {
          errorMessage = '未找到该番号';
        } else if (response.status === 403) {
          errorMessage = '访问被拒绝，请重新登录';
        } else if (response.status === 401) {
          errorMessage = '未授权，请重新登录';
        } else if (response.status >= 500) {
          errorMessage = '服务器错误，请稍后重试';
        } else {
          errorMessage = `请求失败 (${response.status})`;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }

    const result = await response.json();

    return {
      success: true,
      data: result.data
    };

  } catch (error) {
    return {
      success: false,
      error: error.message || '网络请求失败'
    };
  }
}

// Function to subscribe to a movie
async function handleSubscribeMovie(movieId, apiUrl) {
  try {
    if (!apiUrl) {
      throw new Error('请先在扩展中配置 API URL');
    }

    const response = await fetch(`${apiUrl}/api/movie/${movieId}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ movieId })
    });

    if (!response.ok) {
      let errorMessage = '订阅失败';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `订阅失败 (${response.status})`;
      }
      return {
        success: false,
        error: errorMessage
      };
    }

    const result = await response.json();
    return {
      success: true,
      data: result
    };

  } catch (error) {
    return {
      success: false,
      error: error.message || '订阅失败'
    };
  }
}

// Function to unsubscribe from a movie
async function handleUnsubscribeMovie(movieId, apiUrl) {
  try {
    if (!apiUrl) {
      throw new Error('请先在扩展中配置 API URL');
    }

    const response = await fetch(`${apiUrl}/api/subscribe/movie/${movieId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      let errorMessage = '取消订阅失败';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `取消订阅失败 (${response.status})`;
      }
      return {
        success: false,
        error: errorMessage
      };
    }

    const result = await response.json();
    return {
      success: true,
      data: result
    };

  } catch (error) {
    return {
      success: false,
      error: error.message || '取消订阅失败'
    };
  }
}

// Function to submit a review
async function handleSubmitReview(movieId, data, apiUrl) {
  try {
    if (!apiUrl) {
      throw new Error('请先在扩展中配置 API URL');
    }

    const response = await fetch(`${apiUrl}/api/movie/${movieId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      let errorMessage = '提交评价失败';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `提交评价失败 (${response.status})`;
      }
      return {
        success: false,
        error: errorMessage
      };
    }

    const result = await response.json();
    return {
      success: true,
      data: result
    };

  } catch (error) {
    return {
      success: false,
      error: error.message || '提交评价失败'
    };
  }
}
